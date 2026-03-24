/* js/ui/components/StarterSelection.js */
import { t } from '../../i18n/index.js';
import { PokemonCard } from './PokemonCard.js';

export class StarterSelection {
    #pokemon;
    #onSelect;
    #onConfirm;
    #selectedPokemon = [];

    constructor(pokemon, onSelect, onConfirm) {
        this.#pokemon = pokemon;
        this.#onSelect = onSelect;
        this.#onConfirm = onConfirm;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'starter-selection';
        container.innerHTML = `
            <h1 class="starter-selection__title">${t('starter.title')}</h1>
            <p class="starter-selection__subtitle">${t('starter.subtitle')}</p>
            <div class="starter-selection__grid" id="starter-grid"></div>
            <div class="starter-selection__actions">
                <button class="btn btn--secondary" id="btn-back">${t('common.back')}</button>
                <button class="btn btn--primary" id="btn-confirm" disabled>${t('starter.confirm')}</button>
            </div>
        `;

        const grid = container.querySelector('#starter-grid');
        this.#pokemon.forEach(poke => {
            const card = new PokemonCard(poke, (p, selected) => this.#handleSelect(p, selected));
            grid.appendChild(card.render());
        });

        container.querySelector('#btn-back').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
        });

        container.querySelector('#btn-confirm').addEventListener('click', () => {
            if (this.#onConfirm && this.#selectedPokemon.length > 0) {
                this.#onConfirm(this.#selectedPokemon[0]);
            }
        });

        return container;
    }

    #handleSelect(pokemon, selected) {
        if (selected) {
            this.#selectedPokemon.forEach(p => {
                if (p.id !== pokemon.id) {
                    document.querySelectorAll('.pokemon-card').forEach(card => {
                        if (card.querySelector('.pokemon-card__id').textContent === `#${String(p.id).padStart(3, '0')}`) {
                            card.classList.remove('pokemon-card--selected');
                        }
                    });
                }
            });
            this.#selectedPokemon = [pokemon];
        } else {
            this.#selectedPokemon = this.#selectedPokemon.filter(p => p.id !== pokemon.id);
        }

        const confirmBtn = document.querySelector('#btn-confirm');
        if (confirmBtn) {
            confirmBtn.disabled = this.#selectedPokemon.length === 0;
        }

        if (this.#onSelect) {
            this.#onSelect(this.#selectedPokemon);
        }
    }
}
