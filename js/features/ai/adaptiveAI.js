/* js/features/ai/adaptiveAI.js */
const COUNTER_TYPES = {
    normal: ['fighting'],
    fire: ['water', 'ground', 'rock'],
    water: ['electric', 'grass'],
    electric: ['ground'],
    grass: ['fire', 'ice', 'flying', 'bug'],
    ice: ['fire', 'fighting', 'rock', 'steel'],
    fighting: ['flying', 'psychic', 'fairy'],
    poison: ['ground', 'psychic'],
    ground: ['water', 'grass', 'ice'],
    flying: ['electric', 'ice', 'rock'],
    psychic: ['bug', 'ghost', 'dark'],
    bug: ['fire', 'flying', 'rock'],
    rock: ['water', 'grass', 'fighting', 'ground', 'steel'],
    ghost: ['ghost', 'dark'],
    dragon: ['ice', 'dragon', 'fairy'],
    dark: ['fighting', 'bug', 'fairy'],
    steel: ['fire', 'fighting', 'ground'],
    fairy: ['poison', 'steel']
};

export function getPreferredTypes(typeUsage = {}) {
    return Object.entries(typeUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([type]) => type);
}

export function getPlayStyle(metrics = {}) {
    const totalMoves = metrics.totalMoves || 0;
    const aggressive = metrics.aggressiveMoves || 0;
    const defensive = metrics.defensiveMoves || 0;
    const captureAttempts = metrics.captureAttempts || 0;
    const totalActions = totalMoves + captureAttempts;

    if (totalActions > 0 && captureAttempts / totalActions >= 0.3) {
        return 'collector';
    }

    if (aggressive > defensive * 1.2) {
        return 'aggressive';
    }

    if (defensive > aggressive * 1.2) {
        return 'defensive';
    }

    return 'balanced';
}

export function chooseCounterType(preferredTypes = []) {
    for (const preferredType of preferredTypes) {
        const counters = COUNTER_TYPES[preferredType] || [];
        if (counters.length > 0) {
            return counters[Math.floor(Math.random() * counters.length)];
        }
    }

    return null;
}

export function getDifficultyProfile({ playStyle, badgeCount = 0, wins = 0 } = {}) {
    let levelOffset = 1;
    let enemyMode = 'normal';

    if (playStyle === 'aggressive') {
        levelOffset += 1;
        enemyMode = 'hard';
    } else if (playStyle === 'collector') {
        levelOffset -= 1;
        enemyMode = 'easy';
    } else if (playStyle === 'defensive') {
        enemyMode = 'normal';
    }

    if (badgeCount >= 2) {
        levelOffset += 1;
    }

    if (wins >= 6) {
        levelOffset += 1;
    }

    return {
        levelOffset: Math.max(0, levelOffset),
        enemyMode
    };
}
