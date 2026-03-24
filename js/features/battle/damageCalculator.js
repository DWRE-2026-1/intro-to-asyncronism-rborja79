/* js/features/battle/damageCalculator.js */
import { getTypeEffectiveness } from './typeEffectiveness.js';

function getStat(pokemon, statName, fallback = 50) {
    const stat = pokemon.stats.find((entry) => entry.name === statName);
    return stat ? stat.value : fallback;
}

export function calculateDamage(attacker, defender, move) {
    const level = attacker.level || 5;
    const attack = getStat(attacker, 'attack');
    const defense = Math.max(1, getStat(defender, 'defense'));
    const power = Math.max(1, move.power || 0);

    const baseDamage = (((2 * level) / 5 + 2) * power * (attack / defense)) / 50 + 2;

    const isStab = attacker.types.includes(move.type);
    const stab = isStab ? 1.5 : 1;
    const typeMultiplier = getTypeEffectiveness(move.type, defender.types);
    const random = 0.85 + Math.random() * 0.15;

    const finalDamage = Math.max(1, Math.floor(baseDamage * stab * typeMultiplier * random));

    return {
        damage: finalDamage,
        typeMultiplier,
        isStab
    };
}
