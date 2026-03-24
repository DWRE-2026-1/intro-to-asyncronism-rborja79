/* js/features/league/league.js */
export const LEAGUE = {
    id: 'kanto-league',
    name: 'Kanto Pokemon League',
    requiredBadges: 3,
    opponents: [
        {
            id: 'elite-lorelei',
            name: 'Elite Lorelei',
            role: 'elite',
            rewardMoney: 1200,
            pokemon: { id: 131, level: 34 }
        },
        {
            id: 'elite-bruno',
            name: 'Elite Bruno',
            role: 'elite',
            rewardMoney: 1300,
            pokemon: { id: 68, level: 36 }
        },
        {
            id: 'elite-agatha',
            name: 'Elite Agatha',
            role: 'elite',
            rewardMoney: 1450,
            pokemon: { id: 94, level: 38 }
        },
        {
            id: 'elite-lance',
            name: 'Elite Lance',
            role: 'elite',
            rewardMoney: 1700,
            pokemon: { id: 149, level: 41 }
        },
        {
            id: 'champion-blue',
            name: 'Champion Blue',
            role: 'champion',
            rewardMoney: 3000,
            pokemon: { id: 6, level: 45 }
        }
    ]
};
