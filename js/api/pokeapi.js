/* js/api/pokeapi.js */
export class PokeApi {
    #baseUrl = 'https://pokeapi.co/api/v2';
    #cache = new Map();

    async #fetch(endpoint) {
        if (this.#cache.has(endpoint)) {
            return this.#cache.get(endpoint);
        }
        const response = await fetch(`${this.#baseUrl}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        this.#cache.set(endpoint, data);
        return data;
    }

    async getPokemon(idOrName) {
        const data = await this.#fetch(`/pokemon/${idOrName}`);
        return this.#normalizePokemon(data);
    }

    async getRandomPokemon(count = 1) {
        const promises = [];
        for (let i = 0; i < count; i++) {
            const id = Math.floor(Math.random() * 898) + 1;
            promises.push(this.getPokemon(id));
        }
        return Promise.all(promises);
    }

    async getRandomPokemonWithMovesByType(type) {
        const typeData = await this.#fetch(`/type/${type}`);
        const candidates = (typeData.pokemon || []).filter((entry) => {
            const name = entry.pokemon?.name || '';
            return !name.includes('-mega') && !name.includes('-gmax');
        });

        if (candidates.length === 0) {
            throw new Error('No pokemon available for selected type');
        }

        const randomEntry = candidates[Math.floor(Math.random() * candidates.length)];
        return this.getPokemonWithMoves(randomEntry.pokemon.name);
    }

    async getMove(idOrName) {
        const data = await this.#fetch(`/move/${idOrName}`);
        return this.#normalizeMove(data);
    }

    async getEvolutionCandidate(idOrName, level) {
        const speciesData = await this.#fetch(`/pokemon-species/${idOrName}`);
        const evolutionChainData = await this.#fetchByUrl(speciesData.evolution_chain.url);
        const currentSpeciesName = speciesData.name;

        const chainNode = this.#findChainNode(evolutionChainData.chain, currentSpeciesName);
        if (!chainNode || !Array.isArray(chainNode.evolves_to) || chainNode.evolves_to.length === 0) {
            return null;
        }

        const evolutionOption = chainNode.evolves_to.find((evolution) =>
            this.#canEvolveByLevel(evolution.evolution_details, level)
        );

        return evolutionOption ? evolutionOption.species.name : null;
    }

    async getRandomLearnableMove(idOrName, excludeMoveNames = []) {
        const data = await this.#fetch(`/pokemon/${idOrName}`);
        const excluded = new Set(excludeMoveNames.map((name) => name.toLowerCase()));
        const shuffledMoves = [...data.moves].sort(() => Math.random() - 0.5);

        for (const entry of shuffledMoves) {
            if (excluded.has(entry.move.name.toLowerCase())) {
                continue;
            }

            try {
                return await this.getMove(entry.move.name);
            } catch {
                // Try next move
            }
        }

        return null;
    }

    #normalizePokemon(data) {
        return {
            id: data.id,
            name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
            image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
            types: data.types.map(t => t.type.name),
            stats: data.stats.map(s => ({
                name: s.stat.name,
                value: s.base_stat
            })),
            height: data.height,
            weight: data.weight
        };
    }

    #sampleMoveEntries(moveData, count = 12) {
        const shuffled = [...moveData].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    async #fetchByUrl(url) {
        const key = `url:${url}`;
        if (this.#cache.has(key)) {
            return this.#cache.get(key);
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        this.#cache.set(key, data);
        return data;
    }

    #findChainNode(node, speciesName) {
        if (!node) {
            return null;
        }

        if (node.species?.name === speciesName) {
            return node;
        }

        for (const child of node.evolves_to || []) {
            const found = this.#findChainNode(child, speciesName);
            if (found) {
                return found;
            }
        }

        return null;
    }

    #canEvolveByLevel(details = [], level = 1) {
        return details.some((detail) => {
            const isLevelTrigger = detail.trigger?.name === 'level-up';
            const minLevel = Number.isFinite(detail.min_level) ? detail.min_level : null;
            return isLevelTrigger && minLevel !== null && level >= minLevel;
        });
    }

    #fallbackMove() {
        return {
            name: 'Tackle',
            type: 'normal',
            power: 40,
            accuracy: 100
        };
    }

    async #buildMoves(moveData) {
        const sampledEntries = this.#sampleMoveEntries(moveData, 16);
        const moveResults = await Promise.all(
            sampledEntries.map(async (entry) => {
                try {
                    return await this.getMove(entry.move.name);
                } catch {
                    return null;
                }
            })
        );

        const validMoves = moveResults.filter((move) => move !== null);
        const damagingMoves = validMoves.filter((move) => move.power > 0);
        const selectedMoves = [...damagingMoves];

        for (const move of validMoves) {
            if (selectedMoves.length >= 4) {
                break;
            }

            if (!selectedMoves.some((selected) => selected.name === move.name)) {
                selectedMoves.push(move);
            }
        }

        while (selectedMoves.length < 4) {
            selectedMoves.push(this.#fallbackMove());
        }

        return selectedMoves.slice(0, 4);
    }

    async getPokemonWithMoves(idOrName) {
        const data = await this.#fetch(`/pokemon/${idOrName}`);
        const normalizedMoves = await this.#buildMoves(data.moves);

        return {
            id: data.id,
            name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
            image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
            types: data.types.map(t => t.type.name),
            stats: data.stats.map(s => ({
                name: s.stat.name,
                value: s.base_stat
            })),
            height: data.height,
            weight: data.weight,
            moves: normalizedMoves
        };
    }

    #normalizeMove(data) {
        return {
            name: data.name.replace(/-/g, ' ').split(' ').map(
                word => word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            type: data.type.name,
            power: data.power ?? 0,
            accuracy: data.accuracy ?? 100
        };
    }
}

export const pokeApi = new PokeApi();
