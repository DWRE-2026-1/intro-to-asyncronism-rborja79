/* js/features/gym/gyms.js */
export const GYMS = [
    {
        id: 'pewter-gym',
        name: 'Pewter Gym',
        type: 'rock',
        badge: 'Boulder Badge',
        rewardMoney: 1200,
        trainers: [
            {
                id: 'camper-liam',
                name: 'Camper Liam',
                rewardMoney: 200,
                pokemon: {
                    id: 74,
                    level: 10
                }
            },
            {
                id: 'hiker-noah',
                name: 'Hiker Noah',
                rewardMoney: 240,
                pokemon: {
                    id: 95,
                    level: 12
                }
            }
        ],
        leader: {
            id: 'brock',
            name: 'Leader Brock',
            rewardMoney: 550,
            pokemon: {
                id: 141,
                level: 14
            }
        }
    },
    {
        id: 'cerulean-gym',
        name: 'Cerulean Gym',
        type: 'water',
        badge: 'Cascade Badge',
        rewardMoney: 1450,
        trainers: [
            {
                id: 'swimmer-ava',
                name: 'Swimmer Ava',
                rewardMoney: 260,
                pokemon: {
                    id: 90,
                    level: 16
                }
            },
            {
                id: 'sailor-kai',
                name: 'Sailor Kai',
                rewardMoney: 280,
                pokemon: {
                    id: 99,
                    level: 17
                }
            }
        ],
        leader: {
            id: 'misty',
            name: 'Leader Misty',
            rewardMoney: 700,
            pokemon: {
                id: 121,
                level: 19
            }
        }
    },
    {
        id: 'vermilion-gym',
        name: 'Vermilion Gym',
        type: 'electric',
        badge: 'Thunder Badge',
        rewardMoney: 1800,
        trainers: [
            {
                id: 'gentleman-hugo',
                name: 'Gentleman Hugo',
                rewardMoney: 320,
                pokemon: {
                    id: 82,
                    level: 22
                }
            },
            {
                id: 'engineer-dex',
                name: 'Engineer Dex',
                rewardMoney: 340,
                pokemon: {
                    id: 100,
                    level: 23
                }
            }
        ],
        leader: {
            id: 'lt-surge',
            name: 'Leader Surge',
            rewardMoney: 900,
            pokemon: {
                id: 26,
                level: 25
            }
        }
    }
];
