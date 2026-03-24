/* js/features/battle/teamOrder.js */
export function getNextTeamIndex(team, currentIndex) {
    if (!Array.isArray(team) || team.length === 0) {
        return -1;
    }

    for (let i = currentIndex + 1; i < team.length; i += 1) {
        const pokemon = team[i];
        if (pokemon && (pokemon.currentHp || 0) > 0) {
            return i;
        }
    }

    return -1;
}
