/* js/state/store.js */
export class Store {
    #state;
    #listeners = [];
    #storageKey = 'pokemon-arena-state';

    constructor() {
        this.#state = this.#createDefaultState();
    }

    #createDefaultState() {
        return {
            currentPage: 'home',
            language: 'es',
            soundEnabled: true,
            musicVolume: 0.4,
            effectsVolume: 0.7,
            player: {
                name: 'Trainer',
                badges: [],
                defeatedTrainers: []
            },
            capturedCatalog: [],
            activeTeam: [],
            team: [],
            collection: [],
            inventory: {
                berries: {
                    healing: 0,
                    training: 0,
                    attack_boost: 0,
                    defense_boost: 0,
                    capture_boost: 0
                }
            },
            gyms: {
                defeatedTrainers: {},
                defeatedLeaders: {},
                earnedBadges: []
            },
            league: {
                defeatedOpponents: [],
                championDefeated: false
            },
            ai: {
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
            },
            helper: {
                tutorialSeen: false
            },
            pokedex: {
                caught: [],
                seen: []
            },
            money: 1000,
            gameStarted: false,
            lastSaved: null
        };
    }

    #withDefaults(state) {
        const incoming = state && typeof state === 'object' ? state : {};
        const defaults = this.#createDefaultState();

        return {
            ...defaults,
            ...incoming,
            player: {
                ...defaults.player,
                ...(incoming.player || {})
            },
            pokedex: {
                ...defaults.pokedex,
                ...(incoming.pokedex || {})
            },
            inventory: {
                ...defaults.inventory,
                ...(incoming.inventory || {}),
                berries: {
                    ...defaults.inventory.berries,
                    ...((incoming.inventory && incoming.inventory.berries) || {})
                }
            },
            gyms: {
                ...defaults.gyms,
                ...(incoming.gyms || {}),
                defeatedTrainers: {
                    ...defaults.gyms.defeatedTrainers,
                    ...((incoming.gyms && incoming.gyms.defeatedTrainers) || {})
                },
                defeatedLeaders: {
                    ...defaults.gyms.defeatedLeaders,
                    ...((incoming.gyms && incoming.gyms.defeatedLeaders) || {})
                },
                earnedBadges: Array.isArray(incoming.gyms?.earnedBadges)
                    ? incoming.gyms.earnedBadges
                    : defaults.gyms.earnedBadges
            },
            league: {
                ...defaults.league,
                ...(incoming.league || {}),
                defeatedOpponents: Array.isArray(incoming.league?.defeatedOpponents)
                    ? incoming.league.defeatedOpponents
                    : defaults.league.defeatedOpponents,
                championDefeated: Boolean(incoming.league?.championDefeated)
            },
            ai: {
                ...defaults.ai,
                ...(incoming.ai || {}),
                typeUsage: {
                    ...defaults.ai.typeUsage,
                    ...((incoming.ai && incoming.ai.typeUsage) || {})
                },
                metrics: {
                    ...defaults.ai.metrics,
                    ...((incoming.ai && incoming.ai.metrics) || {})
                }
            },
            helper: {
                ...defaults.helper,
                ...(incoming.helper || {}),
                tutorialSeen: Boolean(incoming.helper?.tutorialSeen)
            },
            capturedCatalog: Array.isArray(incoming.capturedCatalog)
                ? incoming.capturedCatalog
                : this.#buildCapturedCatalogFallback(incoming),
            activeTeam: Array.isArray(incoming.activeTeam)
                ? incoming.activeTeam
                : this.#buildActiveTeamFallback(incoming),
            team: Array.isArray(incoming.team) ? incoming.team : defaults.team,
            collection: Array.isArray(incoming.collection) ? incoming.collection : defaults.collection,
            language: typeof incoming.language === 'string' ? incoming.language : defaults.language,
            soundEnabled: typeof incoming.soundEnabled === 'boolean' ? incoming.soundEnabled : defaults.soundEnabled,
            musicVolume: Number.isFinite(incoming.musicVolume) ? Math.min(1, Math.max(0, incoming.musicVolume)) : defaults.musicVolume,
            effectsVolume: Number.isFinite(incoming.effectsVolume) ? Math.min(1, Math.max(0, incoming.effectsVolume)) : defaults.effectsVolume,
            money: Number.isFinite(incoming.money) ? incoming.money : defaults.money
        };
    }

    #buildCapturedCatalogFallback(incoming) {
        const result = [];
        const seen = new Set();
        const mergeList = [];

        if (Array.isArray(incoming.team)) {
            mergeList.push(...incoming.team);
        }
        if (Array.isArray(incoming.collection)) {
            mergeList.push(...incoming.collection);
        }

        mergeList.forEach((pokemon, index) => {
            if (!pokemon || typeof pokemon !== 'object') {
                return;
            }

            const instanceId = pokemon.instanceId || `legacy-${pokemon.id || 'pk'}-${index}`;
            if (seen.has(instanceId)) {
                return;
            }
            seen.add(instanceId);
            result.push({ ...pokemon, instanceId });
        });

        return result;
    }

    #buildActiveTeamFallback(incoming) {
        if (!Array.isArray(incoming.team)) {
            return [];
        }

        return incoming.team
            .map((pokemon, index) => pokemon?.instanceId || `legacy-${pokemon?.id || 'pk'}-${index}`)
            .slice(0, 6);
    }

    getState() {
        return JSON.parse(JSON.stringify(this.#state));
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.#state);
    }

    setState(updates) {
        this.#state = { ...this.#state, ...updates };
        this.#notify();
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], this.#state);
        target[lastKey] = value;
        this.#notify();
    }

    save() {
        this.#state.lastSaved = Date.now();
        const serialized = JSON.stringify(this.#state);
        localStorage.setItem(this.#storageKey, serialized);
        return true;
    }

    load() {
        const saved = localStorage.getItem(this.#storageKey);
        if (!saved) return false;
        try {
            this.#state = this.#withDefaults(JSON.parse(saved));
            this.#notify();
            return true;
        } catch {
            return false;
        }
    }

    hasSave() {
        return localStorage.getItem(this.#storageKey) !== null;
    }

    deleteSave() {
        localStorage.removeItem(this.#storageKey);
        this.#state = this.#createDefaultState();
        this.#notify();
    }

    newGame() {
        const preservedLanguage = this.#state.language || 'es';
        const preservedSound = typeof this.#state.soundEnabled === 'boolean' ? this.#state.soundEnabled : true;
        const preservedMusicVolume = Number.isFinite(this.#state.musicVolume) ? this.#state.musicVolume : 0.4;
        const preservedEffectsVolume = Number.isFinite(this.#state.effectsVolume) ? this.#state.effectsVolume : 0.7;
        this.#state = this.#createDefaultState();
        this.#state.language = preservedLanguage;
        this.#state.soundEnabled = preservedSound;
        this.#state.musicVolume = preservedMusicVolume;
        this.#state.effectsVolume = preservedEffectsVolume;
        this.#state.gameStarted = true;
        this.save();
        this.#notify();
    }

    subscribe(callback) {
        this.#listeners.push(callback);
        return () => {
            this.#listeners = this.#listeners.filter(cb => cb !== callback);
        };
    }

    #notify() {
        this.#listeners.forEach(cb => cb(this.#state));
    }
}

export const store = new Store();
