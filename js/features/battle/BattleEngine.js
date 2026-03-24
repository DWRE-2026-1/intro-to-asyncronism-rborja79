/* js/features/battle/BattleEngine.js */
import { t } from '../../i18n/index.js';
import { calculateDamage } from './damageCalculator.js';
import { getTypeEffectiveness } from './typeEffectiveness.js';

function clonePokemon(pokemon) {
    return {
        ...pokemon,
        stats: [...pokemon.stats],
        moves: [...pokemon.moves],
        currentHp: pokemon.currentHp ?? pokemon.maxHp,
        maxHp: pokemon.maxHp
    };
}

function applyStatMultiplier(pokemon, statName, multiplier) {
    return {
        ...pokemon,
        stats: pokemon.stats.map((entry) => {
            if (entry.name !== statName) {
                return entry;
            }

            return {
                ...entry,
                value: Math.max(1, Math.floor(entry.value * multiplier))
            };
        })
    };
}

export class BattleEngine {
    #state = null;

    startBattle(playerPokemon, enemyPokemon, options = {}) {
        this.#state = {
            turn: 'player',
            winner: null,
            message: t('battle.start'),
            log: [t('battle.start')],
            difficulty: options.difficulty || 'normal',
            canCapture: options.canCapture !== false,
            playerBuffs: {
                attack: options.initialPlayerBuffs?.attack || 0,
                defense: options.initialPlayerBuffs?.defense || 0,
                capture: options.initialPlayerBuffs?.capture || 0
            },
            player: clonePokemon(playerPokemon),
            enemy: clonePokemon(enemyPokemon)
        };

        this.#state.message = t('battle.start');

        return this.getState();
    }

    getState() {
        const state = JSON.parse(JSON.stringify(this.#state));
        state.captureChance = this.#captureChance();
        return state;
    }

    isActive() {
        return this.#state !== null && this.#state.winner === null;
    }

    executePlayerMove(moveIndex) {
        if (!this.isActive() || this.#state.turn !== 'player') {
            return this.getState();
        }

        const move = this.#state.player.moves[moveIndex];
        if (!move) {
            return this.getState();
        }

        this.#executeTurn(this.#state.player, this.#state.enemy, move);

        if (this.#state.enemy.currentHp <= 0) {
            this.#state.enemy.currentHp = 0;
            this.#state.winner = 'player';
            this.#appendLog(t('battle.faintedWin', { name: this.#state.enemy.name }));
            this.#state.message = t('battle.win');
            return this.getState();
        }

        this.#state.turn = 'enemy';
        return this.getState();
    }

    attemptCapture() {
        if (!this.isActive() || this.#state.turn !== 'player') {
            return this.getState();
        }

        if (this.#state.enemy.currentHp <= 0) {
            this.#state.message = t('battle.captureFainted');
            return this.getState();
        }

        if (!this.#state.canCapture) {
            this.#state.message = t('berry.noEffect');
            return this.getState();
        }

        const chance = this.#captureChance();
        const roll = Math.random();

        if (roll <= chance) {
            this.#state.winner = 'captured';
            this.#state.message = t('battle.captureSuccess', { value: Math.round(chance * 100) });
            this.#appendLog(t('battle.captureGotcha', { name: this.#state.enemy.name }));
            return this.getState();
        }

        this.#state.turn = 'enemy';
        this.#state.message = t('battle.captureFail', { value: Math.round(chance * 100) });
        this.#appendLog(t('battle.captureBrokeFree', { name: this.#state.enemy.name }));
        return this.getState();
    }

    usePlayerBerry(berryKey) {
        if (!this.isActive() || this.#state.turn !== 'player') {
            return { ...this.getState(), berryConsumed: false };
        }

        if (!berryKey) {
            this.#state.message = t('berry.noEffect');
            return { ...this.getState(), berryConsumed: false };
        }

        if (berryKey === 'healing') {
            const healAmount = Math.max(20, Math.floor(this.#state.player.maxHp * 0.35));
            const nextHp = Math.min(this.#state.player.maxHp, this.#state.player.currentHp + healAmount);
            if (nextHp <= this.#state.player.currentHp) {
                this.#state.message = t('berry.noEffect');
                this.#appendLog(t('berry.noEffect'));
                return { ...this.getState(), berryConsumed: false };
            }

            this.#state.player.currentHp = nextHp;
            this.#state.message = t('berry.healing.used', { name: this.#state.player.name });
            this.#appendLog(t('berry.healing.used', { name: this.#state.player.name }));
            this.#state.turn = 'enemy';
            return { ...this.getState(), berryConsumed: true };
        }

        if (berryKey === 'attack_boost' || berryKey === 'defense_boost' || berryKey === 'capture_boost') {
            const buffKey = berryKey === 'attack_boost'
                ? 'attack'
                : berryKey === 'defense_boost'
                    ? 'defense'
                    : 'capture';

            if (buffKey === 'capture' && !this.#state.canCapture) {
                this.#state.message = t('berry.noEffect');
                this.#appendLog(t('berry.noEffect'));
                return { ...this.getState(), berryConsumed: false };
            }

            if ((this.#state.playerBuffs[buffKey] || 0) >= 2) {
                this.#state.message = t('berry.maxBuff');
                this.#appendLog(t('berry.maxBuff'));
                return { ...this.getState(), berryConsumed: false };
            }

            this.#state.playerBuffs[buffKey] = (this.#state.playerBuffs[buffKey] || 0) + 1;
            this.#state.message = t(`berry.${berryKey}.used`, { name: this.#state.player.name });
            this.#appendLog(t(`berry.${berryKey}.used`, { name: this.#state.player.name }));
            this.#state.turn = 'enemy';
            return { ...this.getState(), berryConsumed: true };
        }

        if (berryKey === 'training') {
            this.#state.message = t('berry.noEffect');
            this.#appendLog(t('berry.noEffect'));
            return { ...this.getState(), berryConsumed: false };
        }

        this.#state.message = t('berry.noEffect');
        this.#appendLog(t('berry.noEffect'));
        return { ...this.getState(), berryConsumed: false };
    }

    executeEnemyTurn() {
        if (!this.isActive() || this.#state.turn !== 'enemy') {
            return this.getState();
        }

        const moveIndex = this.#chooseEnemyMoveIndex();
        const move = this.#state.enemy.moves[moveIndex];

        this.#executeTurn(this.#state.enemy, this.#state.player, move);

        if (this.#state.player.currentHp <= 0) {
            this.#state.player.currentHp = 0;
            this.#state.winner = 'enemy';
            this.#appendLog(t('battle.faintedLose', { name: this.#state.player.name }));
            this.#state.message = t('battle.lose');
            return this.getState();
        }

        this.#state.turn = 'player';
        this.#state.message = t('battle.chooseMove');
        return this.getState();
    }

    #executeTurn(attacker, defender, move) {
        let effectiveAttacker = attacker;
        let effectiveDefender = defender;

        if (attacker === this.#state.player && (this.#state.playerBuffs.attack || 0) > 0) {
            effectiveAttacker = applyStatMultiplier(attacker, 'attack', 1 + this.#state.playerBuffs.attack * 0.2);
        }

        if (defender === this.#state.player && (this.#state.playerBuffs.defense || 0) > 0) {
            effectiveDefender = applyStatMultiplier(defender, 'defense', 1 + this.#state.playerBuffs.defense * 0.2);
        }

        const accuracyRoll = Math.random() * 100;
        if (accuracyRoll > move.accuracy) {
            this.#appendLog(t('battle.missedLog', { attacker: attacker.name, move: move.name }));
            this.#state.message = t('battle.attackMissed', { name: attacker.name });
            return;
        }

        const { damage, typeMultiplier } = calculateDamage(effectiveAttacker, effectiveDefender, move);
        defender.currentHp = Math.max(0, defender.currentHp - damage);

        const effectivenessMessage = this.#effectivenessMessage(typeMultiplier);
        this.#appendLog(t('battle.attackUsed', {
            attacker: attacker.name,
            move: move.name,
            damage,
            effect: effectivenessMessage
        }));
        this.#state.message = t('battle.attackUsed', {
            attacker: attacker.name,
            move: move.name,
            damage,
            effect: ''
        });
    }

    #effectivenessMessage(multiplier) {
        if (multiplier >= 2) {
            return t('battle.effect.super');
        }

        if (multiplier > 0 && multiplier < 1) {
            return t('battle.effect.low');
        }

        if (multiplier === 0) {
            return t('battle.effect.none');
        }

        return '';
    }

    #appendLog(message) {
        this.#state.log.unshift(message);
        this.#state.log = this.#state.log.slice(0, 8);
    }

    #captureChance() {
        if (!this.#state || !this.#state.enemy || !this.#state.enemy.maxHp) {
            return 0;
        }

        const hpRatio = this.#state.enemy.currentHp / this.#state.enemy.maxHp;
        const baseChance = 0.2;
        const bonus = (1 - hpRatio) * 0.65;
        const captureBoost = (this.#state.playerBuffs?.capture || 0) * 0.12;
        return Math.max(0.05, Math.min(0.95, baseChance + bonus + captureBoost));
    }

    #chooseEnemyMoveIndex() {
        const moves = this.#state.enemy.moves;
        if (!Array.isArray(moves) || moves.length === 0) {
            return 0;
        }

        const rankedMoves = moves
            .map((move, index) => {
                const power = Math.max(1, move.power || 0);
                const accuracyWeight = (move.accuracy || 100) / 100;
                const effectiveness = getTypeEffectiveness(move.type, this.#state.player.types);
                const score = power * accuracyWeight * effectiveness;
                return { index, score };
            })
            .sort((a, b) => b.score - a.score);

        const bestIndex = rankedMoves[0]?.index ?? 0;
        const randomIndex = Math.floor(Math.random() * moves.length);

        if (this.#state.difficulty === 'hard') {
            return bestIndex;
        }

        if (this.#state.difficulty === 'easy') {
            return Math.random() < 0.3 ? bestIndex : randomIndex;
        }

        return Math.random() < 0.6 ? bestIndex : randomIndex;
    }
}
