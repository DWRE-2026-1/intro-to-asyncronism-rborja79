/* js/state/GameState.js */
import { pokeApi } from '../api/pokeapi.js';
import { chooseCounterType, getDifficultyProfile, getPlayStyle, getPreferredTypes } from '../features/ai/index.js';
import { GYMS } from '../features/gym/index.js';
import { t } from '../i18n/index.js';
import { LEAGUE } from '../features/league/index.js';
import { store } from './store.js';

export class GameState {
    static BERRY_SHOP_ITEMS = [
        {
            key: 'healing',
            name: 'Healing Berry',
            description: 'Restores HP in battle.',
            price: 150
        },
        {
            key: 'training',
            name: 'Training Berry',
            description: 'Grants a small EXP boost.',
            price: 180
        },
        {
            key: 'attack_boost',
            name: 'Attack Berry',
            description: 'Boosts attack for one battle.',
            price: 220
        },
        {
            key: 'defense_boost',
            name: 'Defense Berry',
            description: 'Boosts defense for one battle.',
            price: 220
        },
        {
            key: 'capture_boost',
            name: 'Capture Berry',
            description: 'Increases capture chance temporarily.',
            price: 260
        }
    ];

    getGyms() {
        return GYMS.map((gym) => ({ ...gym }));
    }

    getLeague() {
        return {
            ...LEAGUE,
            opponents: LEAGUE.opponents.map((opponent) => ({ ...opponent }))
        };
    }

    getAiProfile() {
        const ai = store.get('ai');
        return ai && typeof ai === 'object'
            ? ai
            : {
                typeUsage: {},
                metrics: {
                    totalMoves: 0,
                    aggressiveMoves: 0,
                    defensiveMoves: 0,
                    captureAttempts: 0,
                    captureSuccesses: 0,
                    battleWins: 0,
                    battleLosses: 0
                }
            };
    }

    recordPlayerMove(move) {
        if (!move) {
            return;
        }

        const ai = this.getAiProfile();
        const nextTypeUsage = {
            ...ai.typeUsage,
            [move.type]: (ai.typeUsage[move.type] || 0) + 1
        };

        const isAggressive = (move.power || 0) >= 70 || (move.accuracy || 100) < 90;
        const nextMetrics = {
            ...ai.metrics,
            totalMoves: (ai.metrics.totalMoves || 0) + 1,
            aggressiveMoves: (ai.metrics.aggressiveMoves || 0) + (isAggressive ? 1 : 0),
            defensiveMoves: (ai.metrics.defensiveMoves || 0) + (isAggressive ? 0 : 1)
        };

        store.set('ai', {
            ...ai,
            typeUsage: nextTypeUsage,
            metrics: nextMetrics
        });
    }

    recordCaptureAttempt(success = false) {
        const ai = this.getAiProfile();
        const nextMetrics = {
            ...ai.metrics,
            captureAttempts: (ai.metrics.captureAttempts || 0) + 1,
            captureSuccesses: (ai.metrics.captureSuccesses || 0) + (success ? 1 : 0)
        };

        store.set('ai', {
            ...ai,
            metrics: nextMetrics
        });
    }

    recordBattleOutcome(won) {
        const ai = this.getAiProfile();
        const nextMetrics = {
            ...ai.metrics,
            battleWins: (ai.metrics.battleWins || 0) + (won ? 1 : 0),
            battleLosses: (ai.metrics.battleLosses || 0) + (won ? 0 : 1)
        };

        store.set('ai', {
            ...ai,
            metrics: nextMetrics
        });
    }

    getAdaptiveEnemyProfile() {
        const ai = this.getAiProfile();
        const preferredTypes = getPreferredTypes(ai.typeUsage);
        const playStyle = getPlayStyle(ai.metrics);
        const badgeCount = this.getGymProgress().earnedBadges.length;
        const wins = ai.metrics.battleWins || 0;
        const difficulty = getDifficultyProfile({ playStyle, badgeCount, wins });

        return {
            preferredTypes,
            playStyle,
            counterType: chooseCounterType(preferredTypes),
            ...difficulty
        };
    }

    getLeagueProgress() {
        const progress = store.get('league');
        return progress && typeof progress === 'object'
            ? progress
            : {
                defeatedOpponents: [],
                championDefeated: false
            };
    }

    isLeagueUnlocked() {
        const badgeCount = this.getGymProgress().earnedBadges.length;
        return badgeCount >= LEAGUE.requiredBadges;
    }

    getLeagueStatus() {
        const progress = this.getLeagueProgress();
        const defeatedOpponents = progress.defeatedOpponents || [];
        const nextOpponent = LEAGUE.opponents.find((opponent) => !defeatedOpponents.includes(opponent.id)) || null;

        return {
            unlocked: this.isLeagueUnlocked(),
            defeatedOpponents,
            defeatedCount: defeatedOpponents.length,
            totalOpponents: LEAGUE.opponents.length,
            championDefeated: Boolean(progress.championDefeated),
            nextOpponent
        };
    }

    getNextLeagueOpponent() {
        return this.getLeagueStatus().nextOpponent;
    }

    markLeagueOpponentDefeated(opponentId) {
        const progress = this.getLeagueProgress();
        const defeated = new Set(progress.defeatedOpponents || []);
        defeated.add(opponentId);

        store.set('league', {
            ...progress,
            defeatedOpponents: [...defeated]
        });
    }

    markChampionDefeated() {
        const progress = this.getLeagueProgress();
        store.set('league', {
            ...progress,
            championDefeated: true
        });
        this.updatePlayer({ champion: true });
    }

    resetLeagueRun() {
        const progress = this.getLeagueProgress();
        store.set('league', {
            ...progress,
            defeatedOpponents: []
        });
    }

    getGymById(gymId) {
        return GYMS.find((gym) => gym.id === gymId) || null;
    }

    getGymProgress() {
        const progress = store.get('gyms');
        return progress && typeof progress === 'object'
            ? progress
            : {
                defeatedTrainers: {},
                defeatedLeaders: {},
                earnedBadges: []
            };
    }

    getGymStatus(gymId) {
        const gym = this.getGymById(gymId);
        if (!gym) {
            return null;
        }

        const progress = this.getGymProgress();
        const defeatedTrainerIds = progress.defeatedTrainers[gymId] || [];
        const leaderDefeated = Boolean(progress.defeatedLeaders[gymId]);
        const allTrainersDefeated = gym.trainers.every((trainer) => defeatedTrainerIds.includes(trainer.id));

        return {
            gymId,
            defeatedTrainerIds,
            leaderDefeated,
            allTrainersDefeated,
            badgeEarned: progress.earnedBadges.includes(gym.badge),
            nextTrainer: gym.trainers.find((trainer) => !defeatedTrainerIds.includes(trainer.id)) || null
        };
    }

    getNextGymTrainer(gymId) {
        const status = this.getGymStatus(gymId);
        const gym = this.getGymById(gymId);
        if (!status || !gym) {
            return null;
        }

        return status.nextTrainer;
    }

    canChallengeGymLeader(gymId) {
        const status = this.getGymStatus(gymId);
        return Boolean(status && status.allTrainersDefeated && !status.leaderDefeated);
    }

    markGymTrainerDefeated(gymId, trainerId) {
        const gym = this.getGymById(gymId);
        if (!gym) {
            return false;
        }

        const progress = this.getGymProgress();
        const defeatedTrainerIds = new Set(progress.defeatedTrainers[gymId] || []);
        defeatedTrainerIds.add(trainerId);

        store.set('gyms', {
            ...progress,
            defeatedTrainers: {
                ...progress.defeatedTrainers,
                [gymId]: [...defeatedTrainerIds]
            }
        });

        return true;
    }

    markGymLeaderDefeated(gymId) {
        const gym = this.getGymById(gymId);
        if (!gym) {
            return null;
        }

        const progress = this.getGymProgress();
        const earnedBadges = new Set(progress.earnedBadges || []);
        earnedBadges.add(gym.badge);

        store.set('gyms', {
            ...progress,
            defeatedLeaders: {
                ...progress.defeatedLeaders,
                [gymId]: true
            },
            earnedBadges: [...earnedBadges]
        });

        this.addBadge(gym.badge);

        return {
            badge: gym.badge,
            rewardMoney: gym.rewardMoney
        };
    }

    #expForLevel(level) {
        return Math.floor(100 * Math.pow(1.2, level - 1));
    }

    #createInstanceId() {
        return `pk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    #ensureInstance(pokemon) {
        if (!pokemon.instanceId) {
            return {
                ...pokemon,
                instanceId: this.#createInstanceId()
            };
        }

        return pokemon;
    }

    #teamMessage(key) {
        return t(`team.feedback.${key}`);
    }

    #syncLegacyCollections(capturedCatalog, activeTeamIds) {
        const activeTeam = activeTeamIds
            .map((id) => capturedCatalog.find((pokemon) => pokemon.instanceId === id))
            .filter(Boolean);

        store.set('team', activeTeam);
        store.set('collection', capturedCatalog);
    }

    getCapturedCatalog() {
        const catalog = store.get('capturedCatalog');
        if (!Array.isArray(catalog)) {
            return [];
        }

        return catalog.map((pokemon) => this.#ensureInstance({ ...pokemon }));
    }

    getActiveTeamIds() {
        const ids = store.get('activeTeam');
        if (!Array.isArray(ids)) {
            return [];
        }

        return ids.slice(0, 6);
    }

    getActiveTeam() {
        const catalog = this.getCapturedCatalog();
        const ids = this.getActiveTeamIds();
        return ids
            .map((id) => catalog.find((pokemon) => pokemon.instanceId === id))
            .filter(Boolean);
    }

    #saveCatalogAndTeam(catalog, activeTeamIds) {
        const normalizedCatalog = catalog.map((pokemon) => this.#ensureInstance(this.#normalizePokemonForTeam(pokemon, pokemon.level || 5)));
        const uniqueActive = [...new Set(activeTeamIds)].slice(0, 6);

        store.set('capturedCatalog', normalizedCatalog);
        store.set('activeTeam', uniqueActive);
        this.#syncLegacyCollections(normalizedCatalog, uniqueActive);
    }

    addToCapturedCatalog(pokemon, options = {}) {
        const catalog = this.getCapturedCatalog();
        const activeTeamIds = this.getActiveTeamIds();
        const normalizedPokemon = this.#ensureInstance(this.#normalizePokemonForTeam(pokemon, pokemon.level || 5));

        catalog.push(normalizedPokemon);

        const shouldAutoAdd = options.autoAddToTeam !== false;
        if (shouldAutoAdd && activeTeamIds.length < 6) {
            activeTeamIds.push(normalizedPokemon.instanceId);
        }

        this.#saveCatalogAndTeam(catalog, activeTeamIds);
        return normalizedPokemon;
    }

    setCapturedCatalog(catalog) {
        const normalized = Array.isArray(catalog) ? catalog : [];
        this.#saveCatalogAndTeam(normalized, this.getActiveTeamIds());
    }

    setActiveTeamOrder(ids) {
        const catalogIds = new Set(this.getCapturedCatalog().map((pokemon) => pokemon.instanceId));
        const unique = [];
        for (const id of ids) {
            if (unique.length >= 6) {
                break;
            }
            if (!catalogIds.has(id) || unique.includes(id)) {
                continue;
            }
            unique.push(id);
        }

        this.#saveCatalogAndTeam(this.getCapturedCatalog(), unique);
    }

    addToActiveTeam(instanceId) {
        const ids = this.getActiveTeamIds();
        if (ids.includes(instanceId)) {
            return { success: false, message: this.#teamMessage('alreadyInTeam') };
        }
        if (ids.length >= 6) {
            return { success: false, message: this.#teamMessage('teamFull') };
        }

        const catalog = this.getCapturedCatalog();
        const exists = catalog.some((pokemon) => pokemon.instanceId === instanceId);
        if (!exists) {
            return { success: false, message: this.#teamMessage('notInCatalog') };
        }

        ids.push(instanceId);
        this.#saveCatalogAndTeam(catalog, ids);
        return { success: true, message: this.#teamMessage('added') };
    }

    removeFromActiveTeam(instanceId) {
        const ids = this.getActiveTeamIds();
        const next = ids.filter((id) => id !== instanceId);
        if (next.length === ids.length) {
            return { success: false, message: this.#teamMessage('notInTeam') };
        }

        this.#saveCatalogAndTeam(this.getCapturedCatalog(), next);
        return { success: true, message: this.#teamMessage('removed') };
    }

    moveActiveTeamMember(instanceId, direction) {
        const ids = this.getActiveTeamIds();
        const index = ids.indexOf(instanceId);
        if (index === -1) {
            return { success: false, message: this.#teamMessage('notInTeam') };
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= ids.length) {
            return { success: false, message: this.#teamMessage('cannotMove') };
        }

        [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
        this.#saveCatalogAndTeam(this.getCapturedCatalog(), ids);
        return { success: true, message: this.#teamMessage('orderUpdated') };
    }

    swapActiveTeamPositions(indexA, indexB) {
        const ids = this.getActiveTeamIds();
        if (indexA < 0 || indexB < 0 || indexA >= ids.length || indexB >= ids.length) {
            return { success: false, message: this.#teamMessage('invalidSwap') };
        }

        [ids[indexA], ids[indexB]] = [ids[indexB], ids[indexA]];
        this.#saveCatalogAndTeam(this.getCapturedCatalog(), ids);
        return { success: true, message: this.#teamMessage('swapped') };
    }

    replaceActiveTeamMember(slotIndex, instanceId) {
        const ids = this.getActiveTeamIds();
        if (slotIndex < 0 || slotIndex >= 6) {
            return { success: false, message: this.#teamMessage('invalidSlot') };
        }

        if (ids.includes(instanceId) && ids[slotIndex] !== instanceId) {
            return { success: false, message: this.#teamMessage('alreadyInTeam') };
        }

        const exists = this.getCapturedCatalog().some((pokemon) => pokemon.instanceId === instanceId);
        if (!exists) {
            return { success: false, message: this.#teamMessage('notInCatalog') };
        }

        while (ids.length <= slotIndex) {
            ids.push(null);
        }
        ids[slotIndex] = instanceId;

        const compact = ids.filter(Boolean).slice(0, 6);
        this.#saveCatalogAndTeam(this.getCapturedCatalog(), compact);
        return { success: true, message: this.#teamMessage('replaced') };
    }

    applyBattleTeamState(battleParty) {
        const catalog = this.getCapturedCatalog();
        const byId = new Map(catalog.map((pokemon) => [pokemon.instanceId, pokemon]));

        battleParty.forEach((battlePokemon) => {
            if (!battlePokemon?.instanceId || !byId.has(battlePokemon.instanceId)) {
                return;
            }

            byId.set(battlePokemon.instanceId, {
                ...byId.get(battlePokemon.instanceId),
                currentHp: battlePokemon.currentHp,
                maxHp: battlePokemon.maxHp,
                exp: battlePokemon.exp,
                level: battlePokemon.level,
                nextBattleBuffs: battlePokemon.nextBattleBuffs || byId.get(battlePokemon.instanceId).nextBattleBuffs
            });
        });

        this.#saveCatalogAndTeam([...byId.values()], this.getActiveTeamIds());
    }

    getShopItems() {
        return [...GameState.BERRY_SHOP_ITEMS];
    }

    getPlayer() {
        return store.get('player');
    }

    updatePlayer(updates) {
        const player = this.getPlayer();
        store.set('player', { ...player, ...updates });
    }

    getTeam() {
        return this.getActiveTeam();
    }

    getCollection() {
        return this.getCapturedCatalog();
    }

    getInventory() {
        const inventory = store.get('inventory');
        return inventory && typeof inventory === 'object'
            ? inventory
            : {
                berries: {
                    healing: 0,
                    training: 0,
                    attack_boost: 0,
                    defense_boost: 0,
                    capture_boost: 0
                }
            };
    }

    getBerryInventoryList() {
        const inventory = this.getInventory();
        return this.getShopItems().map((item) => ({
            ...item,
            quantity: inventory.berries[item.key] || 0
        }));
    }

    consumeBerry(berryKey, quantity = 1) {
        const inventory = this.getInventory();
        const current = inventory.berries[berryKey] || 0;
        if (current < quantity || quantity <= 0) {
            return false;
        }

        store.set('inventory', {
            ...inventory,
            berries: {
                ...inventory.berries,
                [berryKey]: current - quantity
            }
        });

        return true;
    }

    useBerryOnTeamPokemon(teamIndex, berryKey) {
        const team = this.getTeam();
        if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex >= team.length) {
            return { success: false, message: t('berry.invalidTarget') };
        }

        const inventory = this.getInventory();
        const quantity = inventory.berries[berryKey] || 0;
        if (quantity <= 0) {
            return { success: false, message: t('berry.none') };
        }

        const target = { ...team[teamIndex] };
        let hasEffect = false;
        let message = t('berry.noEffect');

        if (berryKey === 'healing') {
            const healAmount = Math.max(20, Math.floor(target.maxHp * 0.35));
            const nextHp = Math.min(target.maxHp, target.currentHp + healAmount);
            if (nextHp > target.currentHp) {
                target.currentHp = nextHp;
                hasEffect = true;
                message = t('berry.healing.used', { name: target.name });
            }
        }

        if (berryKey === 'training') {
            target.exp = (target.exp || 0) + 40;
            hasEffect = true;
            message = t('berry.training.used', { name: target.name });
        }

        if (berryKey === 'attack_boost' || berryKey === 'defense_boost' || berryKey === 'capture_boost') {
            const buffKey = berryKey === 'attack_boost'
                ? 'attack'
                : berryKey === 'defense_boost'
                    ? 'defense'
                    : 'capture';

            const nextBattleBuffs = {
                attack: 0,
                defense: 0,
                capture: 0,
                ...(target.nextBattleBuffs || {})
            };

            if (nextBattleBuffs[buffKey] >= 2) {
                return { success: false, message: t('berry.maxBuff') };
            }

            nextBattleBuffs[buffKey] += 1;
            target.nextBattleBuffs = nextBattleBuffs;
            hasEffect = true;
            message = t(`berry.${berryKey}.used`, { name: target.name });
        }

        if (!hasEffect) {
            return { success: false, message };
        }

        const consumed = this.consumeBerry(berryKey, 1);
        if (!consumed) {
            return { success: false, message: t('berry.none') };
        }

        team[teamIndex] = target;
        this.setTeam(team);

        return {
            success: true,
            message,
            pokemon: target,
            inventory: this.getInventory()
        };
    }

    consumeNextBattleBuffs(teamIndex) {
        const team = this.getTeam();
        if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex >= team.length) {
            return { attack: 0, defense: 0, capture: 0 };
        }

        const target = { ...team[teamIndex] };
        const buffs = {
            attack: target.nextBattleBuffs?.attack || 0,
            defense: target.nextBattleBuffs?.defense || 0,
            capture: target.nextBattleBuffs?.capture || 0
        };

        target.nextBattleBuffs = { attack: 0, defense: 0, capture: 0 };
        team[teamIndex] = target;
        this.setTeam(team);

        return buffs;
    }

    buyBerry(berryKey, quantity = 1) {
        const item = GameState.BERRY_SHOP_ITEMS.find((entry) => entry.key === berryKey);
        if (!item || quantity <= 0) {
            return { success: false, message: t('common.invalid') };
        }

        const totalCost = item.price * quantity;
        const currentMoney = this.getMoney();

        if (currentMoney < totalCost) {
            return { success: false, message: t('common.notEnoughMoney') };
        }

        const inventory = this.getInventory();
        const nextInventory = {
            ...inventory,
            berries: {
                ...inventory.berries,
                [berryKey]: (inventory.berries[berryKey] || 0) + quantity
            }
        };

        this.spendMoney(totalCost);
        store.set('inventory', nextInventory);

        return {
            success: true,
            message: t('shop.purchased', { name: item.name, cost: totalCost }),
            item,
            quantity,
            totalCost
        };
    }

    #defaultMoves() {
        return [
            { name: 'Tackle', type: 'normal', power: 40, accuracy: 100 },
            { name: 'Quick Attack', type: 'normal', power: 40, accuracy: 100 },
            { name: 'Scratch', type: 'normal', power: 40, accuracy: 100 },
            { name: 'Pound', type: 'normal', power: 40, accuracy: 100 }
        ];
    }

    #normalizeMoves(moves = []) {
        const validMoves = moves
            .filter((move) => move && move.name)
            .map((move) => ({
                name: move.name,
                type: move.type || 'normal',
                power: Number.isFinite(move.power) ? move.power : 40,
                accuracy: Number.isFinite(move.accuracy) ? move.accuracy : 100
            }));

        const result = [...validMoves];
        for (const fallbackMove of this.#defaultMoves()) {
            if (result.length >= 4) {
                break;
            }
            result.push(fallbackMove);
        }

        return result.slice(0, 4);
    }

    #normalizePokemonForTeam(pokemon, level = 5) {
        const hpStat = pokemon.stats.find((stat) => stat.name === 'hp');
        const maxHp = hpStat ? hpStat.value : 50;

        return {
            ...pokemon,
            level: pokemon.level || level,
            exp: Number.isFinite(pokemon.exp) ? pokemon.exp : 0,
            maxHp: Number.isFinite(pokemon.maxHp) ? pokemon.maxHp : maxHp,
            currentHp: Number.isFinite(pokemon.currentHp) ? pokemon.currentHp : maxHp,
            moves: this.#normalizeMoves(pokemon.moves)
        };
    }

    #applyLearnMove(pokemon, move) {
        const currentMoves = [...pokemon.moves];

        if (currentMoves.length < 4) {
            currentMoves.push(move);
            return {
                moves: currentMoves,
                replacedMove: null
            };
        }

        const replaceIndex = Math.floor(Math.random() * 4);
        const replacedMove = currentMoves[replaceIndex];
        currentMoves[replaceIndex] = move;

        return {
            moves: currentMoves,
            replacedMove
        };
    }

    setTeam(pokemon) {
        const normalized = (pokemon || []).map((member) => this.#ensureInstance(this.#normalizePokemonForTeam(member)));
        const existingCatalog = this.getCapturedCatalog();
        const byId = new Map(existingCatalog.map((entry) => [entry.instanceId, entry]));

        normalized.forEach((entry) => {
            byId.set(entry.instanceId, entry);
        });

        const ids = normalized.slice(0, 6).map((member) => member.instanceId);
        this.#saveCatalogAndTeam([...byId.values()], ids);
    }

    addToTeam(pokemon, level = 5) {
        const normalized = this.#ensureInstance(this.#normalizePokemonForTeam({ ...pokemon, level }, level));
        this.addToCapturedCatalog(normalized, { autoAddToTeam: false });
        const result = this.addToActiveTeam(normalized.instanceId);
        return result.success;
    }

    addToCollection(pokemon, level = 5) {
        this.addToCapturedCatalog({ ...pokemon, level }, { autoAddToTeam: false });
        return true;
    }

    capturePokemon(pokemon) {
        const normalizedPokemon = this.#ensureInstance(this.#normalizePokemonForTeam(pokemon, pokemon.level || 5));
        const captured = this.addToCapturedCatalog(normalizedPokemon, { autoAddToTeam: true });
        const addedToTeam = this.getActiveTeamIds().includes(captured.instanceId);

        this.registerCaught(normalizedPokemon.id);

        return {
            destination: addedToTeam ? 'team' : 'collection',
            pokemon: captured
        };
    }

    removeFromTeam(pokemonRef) {
        if (typeof pokemonRef === 'string') {
            this.removeFromActiveTeam(pokemonRef);
            return;
        }

        const team = this.getActiveTeam();
        const target = team.find((pokemon) => pokemon.id === pokemonRef);
        if (target) {
            this.removeFromActiveTeam(target.instanceId);
        }
    }

    async addExp(pokemonRef, amount) {
        const team = this.getTeam();
        const pokemonIndex = team.findIndex((pokemon) => {
            if (typeof pokemonRef === 'string') {
                return pokemon.instanceId === pokemonRef;
            }

            return pokemon.id === pokemonRef;
        });
        if (pokemonIndex === -1) return null;

        let pokemon = { ...team[pokemonIndex] };
        pokemon.exp += amount;

        let levelsGained = 0;

        while (pokemon.level < 100 && pokemon.exp >= this.#expForLevel(pokemon.level + 1)) {
            const expForNext = this.#expForLevel(pokemon.level + 1);
            pokemon.exp -= expForNext;
            pokemon.level++;
            levelsGained++;
        }

        if (levelsGained > 0) {
            pokemon.stats = this.#applyLevelUp(pokemon.stats, levelsGained);
        }

        team[pokemonIndex] = pokemon;
        this.setTeam(team);

        let evolution = null;
        let learnedMove = null;

        if (levelsGained > 0) {
            const updatedTeam = this.getTeam();
            const updatedIndex = updatedTeam.findIndex((member) => member.instanceId === pokemon.instanceId);

            if (updatedIndex !== -1) {
                let evolvingPokemon = { ...updatedTeam[updatedIndex] };

                while (true) {
                    const evolutionCandidate = await pokeApi.getEvolutionCandidate(evolvingPokemon.id, evolvingPokemon.level);
                    if (!evolutionCandidate) {
                        break;
                    }

                    const evolvedData = await pokeApi.getPokemonWithMoves(evolutionCandidate);
                    const nextMaxHp = evolvedData.stats.find((stat) => stat.name === 'hp')?.value || evolvingPokemon.maxHp;
                    const hpRatio = evolvingPokemon.maxHp > 0 ? evolvingPokemon.currentHp / evolvingPokemon.maxHp : 1;

                    const evolvedPokemon = {
                        ...evolvingPokemon,
                        id: evolvedData.id,
                        name: evolvedData.name,
                        image: evolvedData.image,
                        types: evolvedData.types,
                        stats: evolvedData.stats,
                        height: evolvedData.height,
                        weight: evolvedData.weight,
                        maxHp: nextMaxHp,
                        currentHp: Math.max(1, Math.floor(nextMaxHp * hpRatio)),
                        moves: evolvingPokemon.moves
                    };

                    if (Math.random() < 0.5) {
                        const move = await pokeApi.getRandomLearnableMove(evolvedPokemon.id, evolvedPokemon.moves.map((entry) => entry.name));
                        if (move) {
                            const moveUpdate = this.#applyLearnMove(evolvedPokemon, move);
                            evolvedPokemon.moves = moveUpdate.moves;
                            learnedMove = {
                                move,
                                replacedMove: moveUpdate.replacedMove
                            };
                        }
                    }

                    updatedTeam[updatedIndex] = evolvedPokemon;
                    this.setTeam(updatedTeam);
                    this.registerSeen(evolvedPokemon.id);
                    evolution = {
                        from: {
                            id: evolvingPokemon.id,
                            name: evolvingPokemon.name,
                            image: evolvingPokemon.image
                        },
                        to: {
                            id: evolvedPokemon.id,
                            name: evolvedPokemon.name,
                            image: evolvedPokemon.image
                        }
                    };

                    evolvingPokemon = evolvedPokemon;
                }
            }
        }

        return {
            levelsGained,
            newLevel: pokemon.level,
            evolution,
            learnedMove
        };
    }

    #applyLevelUp(stats, times) {
        return stats.map(stat => ({
            ...stat,
            value: stat.value + Math.floor(stat.value * 0.1 * times)
        }));
    }

    getPokedex() {
        return store.get('pokedex');
    }

    registerCaught(pokemonId) {
        const pokedex = this.getPokedex();
        if (!pokedex.caught.includes(pokemonId)) {
            store.set('pokedex.caught', [...pokedex.caught, pokemonId]);
        }
        if (!pokedex.seen.includes(pokemonId)) {
            store.set('pokedex.seen', [...pokedex.seen, pokemonId]);
        }
    }

    registerSeen(pokemonId) {
        const pokedex = this.getPokedex();
        if (!pokedex.seen.includes(pokemonId)) {
            store.set('pokedex.seen', [...pokedex.seen, pokemonId]);
        }
    }

    getMoney() {
        return store.get('money');
    }

    addMoney(amount) {
        const current = this.getMoney();
        store.set('money', current + amount);
    }

    spendMoney(amount) {
        const current = this.getMoney();
        if (current < amount) return false;
        store.set('money', current - amount);
        return true;
    }

    hasBadge(id) {
        const player = this.getPlayer();
        return player.badges.includes(id);
    }

    addBadge(id) {
        const player = this.getPlayer();
        if (!player.badges.includes(id)) {
            this.updatePlayer({ badges: [...player.badges, id] });
        }
    }
}

export const gameState = new GameState();
