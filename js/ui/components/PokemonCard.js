/* js/ui/components/PokemonCard.js */
export class PokemonCard {
    #pokemon;
    #onSelect;
    #selected = false;

    constructor(pokemon, onSelect) {
        this.#pokemon = pokemon;
        this.#onSelect = onSelect;
    }

    render() {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.innerHTML = this.#getTemplate();
        card.addEventListener('click', () => this.#handleClick(card));
        return card;
    }

    #getTemplate() {
        const typeClass = this.#pokemon.types[0];
        return `
            <div class="pokemon-card__image-container">
                <img class="pokemon-card__image" src="${this.#pokemon.image}" alt="${this.#pokemon.name}">
            </div>
            <div class="pokemon-card__info">
                <span class="pokemon-card__id">#${String(this.#pokemon.id).padStart(3, '0')}</span>
                <h3 class="pokemon-card__name">${this.#pokemon.name}</h3>
                <div class="pokemon-card__types">
                    ${this.#pokemon.types.map(type => `
                        <span class="pokemon-card__type pokemon-card__type--${type}">${type}</span>
                    `).join('')}
                </div>
                ${this.#pokemon.moves ? `
                    <div class="pokemon-card__moves">
                        ${this.#pokemon.moves.slice(0, 4).map(move => `
                            <span class="pokemon-card__move pokemon-card__move--${move.type}">${move.name}</span>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="pokemon-card__stats">
                    ${this.#pokemon.stats.map(stat => `
                        <div class="pokemon-card__stat">
                            <span class="pokemon-card__stat-name">${stat.name}</span>
                            <span class="pokemon-card__stat-value">${stat.value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    #handleClick(card) {
        this.#selected = !this.#selected;
        card.classList.toggle('pokemon-card--selected', this.#selected);
        if (this.#onSelect) {
            this.#onSelect(this.#pokemon, this.#selected);
        }
    }
}
