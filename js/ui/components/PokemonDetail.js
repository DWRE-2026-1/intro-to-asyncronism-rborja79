/* js/ui/components/PokemonDetail.js */
import { t } from '../../i18n/index.js';

export class PokemonDetail {
    #pokemon;
    #onClose;
    #onUseBerry;
    #getBerries;
    #berryFeedback = '';

    constructor(pokemon, onClose = null, options = {}) {
        this.#pokemon = pokemon;
        this.#onClose = onClose;
        this.#onUseBerry = options.onUseBerry || null;
        this.#getBerries = options.getBerries || (() => []);
        this.#berryFeedback = options.feedback || '';
    }

    render() {
        const container = document.createElement('div');
        container.className = 'pokemon-detail';
        container.innerHTML = this.#getTemplate();

        container.querySelector('.pokemon-detail__backdrop')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('pokemon-detail__backdrop')) {
                this.#close();
            }
        });

        container.querySelector('.pokemon-detail__close')?.addEventListener('click', () => {
            this.#close();
        });

        container.querySelectorAll('[data-berry-key]').forEach((button) => {
            button.addEventListener('click', async () => {
                const berryKey = button.dataset.berryKey;
                if (this.#onUseBerry) {
                    await this.#onUseBerry(berryKey);
                }
            });
        });

        return container;
    }

    #getTemplate() {
        const primaryType = this.#pokemon.types[0];
        const expForNext = this.#expForNextLevel(this.#pokemon.level);
        const expProgress = (this.#pokemon.exp / expForNext) * 100;
        const berries = (this.#getBerries() || []).filter((item) => item.quantity > 0);

        return `
            <div class="pokemon-detail__backdrop">
                <div class="pokemon-detail__modal">
                    <button class="pokemon-detail__close">&times;</button>
                    <div class="pokemon-detail__header pokemon-detail__header--${primaryType}">
                        <div class="pokemon-detail__title-row">
                            <div class="pokemon-detail__info">
                                <span class="pokemon-detail__id">#${String(this.#pokemon.id).padStart(3, '0')}</span>
                                <h2 class="pokemon-detail__name">${this.#pokemon.name}</h2>
                            </div>
                            <div class="pokemon-detail__level">
                                <span class="pokemon-detail__level-label">Lv</span>
                                <span class="pokemon-detail__level-value">${this.#pokemon.level}</span>
                            </div>
                        </div>
                        <div class="pokemon-detail__types">
                            ${this.#pokemon.types.map((type) => `
                                <span class="pokemon-detail__type pokemon-detail__type--${type}">${type}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div class="pokemon-detail__image-container">
                        <img class="pokemon-detail__image" src="${this.#pokemon.image}" alt="${this.#pokemon.name}">
                    </div>
                    <div class="pokemon-detail__content">
                        <div class="pokemon-detail__section">
                            <h3 class="pokemon-detail__section-title">Experience</h3>
                            <div class="pokemon-detail__exp">
                                <div class="pokemon-detail__exp-label">
                                    <span>EXP</span>
                                    <span>${this.#pokemon.exp} / ${expForNext}</span>
                                </div>
                                <div class="pokemon-detail__exp-bar">
                                    <div class="pokemon-detail__exp-fill" style="width: ${expProgress}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="pokemon-detail__section">
                            <h3 class="pokemon-detail__section-title">Base Stats</h3>
                            <div class="pokemon-detail__stats">
                                ${this.#pokemon.stats.map((stat) => this.#renderStat(stat)).join('')}
                            </div>
                        </div>
                        <div class="pokemon-detail__section">
                            <h3 class="pokemon-detail__section-title">Moves</h3>
                            <div class="pokemon-detail__moves">
                                ${(this.#pokemon.moves || []).map((move) => this.#renderMove(move)).join('')}
                            </div>
                        </div>
                        <div class="pokemon-detail__section">
                            <h3 class="pokemon-detail__section-title">${t('berry.use')}</h3>
                            <div class="pokemon-detail__berries">
                                ${berries.length > 0 ? berries.map((berry) => this.#renderBerry(berry)).join('') : `<p>${t('berry.none')}</p>`}
                            </div>
                            <p class="pokemon-detail__berry-feedback">${this.#berryFeedback}</p>
                        </div>
                        <div class="pokemon-detail__section pokemon-detail__section--info">
                            <div class="pokemon-detail__info-item">
                                <span class="pokemon-detail__info-label">Height</span>
                                <span class="pokemon-detail__info-value">${(this.#pokemon.height / 10).toFixed(1)} m</span>
                            </div>
                            <div class="pokemon-detail__info-item">
                                <span class="pokemon-detail__info-label">Weight</span>
                                <span class="pokemon-detail__info-value">${(this.#pokemon.weight / 10).toFixed(1)} kg</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    #renderBerry(berry) {
        const effect = t(`berry.${berry.key}.effect`);
        return `
            <button class="pokemon-detail__berry" data-berry-key="${berry.key}" type="button">
                <span class="pokemon-detail__berry-name">${berry.name} x${berry.quantity}</span>
                <span class="pokemon-detail__berry-meta">${t('berry.effect', { value: effect })}</span>
            </button>
        `;
    }

    #renderStat(stat) {
        const statMap = {
            hp: { name: 'HP', color: '#ff5959' },
            attack: { name: 'Attack', color: '#f5ac78' },
            defense: { name: 'Defense', color: '#fae078' },
            'special-attack': { name: 'Sp. Atk', color: '#9db7f5' },
            'special-defense': { name: 'Sp. Def', color: '#a7db8d' },
            speed: { name: 'Speed', color: '#fa92b2' }
        };

        const config = statMap[stat.name.toLowerCase()] || { name: stat.name, color: '#888' };
        const percentage = Math.min((stat.value / 255) * 100, 100);

        return `
            <div class="pokemon-detail__stat">
                <span class="pokemon-detail__stat-name">${config.name}</span>
                <span class="pokemon-detail__stat-value">${stat.value}</span>
                <div class="pokemon-detail__stat-bar">
                    <div class="pokemon-detail__stat-fill" style="width: ${percentage}%; background: ${config.color}"></div>
                </div>
            </div>
        `;
    }

    #renderMove(move) {
        const powerDisplay = move.power !== null && move.power !== undefined ? move.power : '-';
        const accuracyDisplay = move.accuracy !== null && move.accuracy !== undefined ? move.accuracy : '-';

        return `
            <div class="pokemon-detail__move">
                <span class="pokemon-detail__move-name">${move.name}</span>
                <span class="pokemon-detail__move-type pokemon-detail__move-type--${move.type}">${move.type}</span>
                <div class="pokemon-detail__move-stats">
                    <span class="pokemon-detail__move-stat">
                        <span class="pokemon-detail__move-stat-label">PWR</span>
                        <span class="pokemon-detail__move-stat-value">${powerDisplay}</span>
                    </span>
                    <span class="pokemon-detail__move-stat">
                        <span class="pokemon-detail__move-stat-label">ACC</span>
                        <span class="pokemon-detail__move-stat-value">${accuracyDisplay}%</span>
                    </span>
                </div>
            </div>
        `;
    }

    #expForNextLevel(level) {
        return Math.floor(100 * Math.pow(1.2, level - 1));
    }

    #close() {
        if (this.#onClose) this.#onClose();
    }
}
