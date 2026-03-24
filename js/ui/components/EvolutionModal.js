/* js/ui/components/EvolutionModal.js */
import { t } from '../../i18n/index.js';

export class EvolutionModal {
    #evolution;
    #learnedMove;
    #onClose;

    constructor(evolution, learnedMove, onClose) {
        this.#evolution = evolution;
        this.#learnedMove = learnedMove;
        this.#onClose = onClose;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'evolution-modal';
        container.innerHTML = this.#template();

        container.querySelector('.evolution-modal__backdrop')?.addEventListener('click', (event) => {
            if (event.target.classList.contains('evolution-modal__backdrop')) {
                this.#close();
            }
        });

        container.querySelector('#evolution-close')?.addEventListener('click', () => this.#close());
        return container;
    }

    #template() {
        const learnedMoveText = this.#learnedMove
            ? `
                <div class="evolution-modal__move">
                    <p>${t('evolution.learned', { pokemon: this.#evolution.to.name, move: this.#learnedMove.move.name })}</p>
                    ${this.#learnedMove.replacedMove ? `<p>${t('evolution.replaced', { move: this.#learnedMove.replacedMove.name })}</p>` : ''}
                </div>
            `
            : '';

        return `
            <div class="evolution-modal__backdrop">
                <div class="evolution-modal__dialog">
                    <h2 class="evolution-modal__title">${t('evolution.title')}</h2>
                    <p class="evolution-modal__subtitle">${t('evolution.subtitle', { from: this.#evolution.from.name, to: this.#evolution.to.name })}</p>
                    <div class="evolution-modal__showcase">
                        <div class="evolution-modal__pokemon">
                            <img src="${this.#evolution.from.image}" alt="${this.#evolution.from.name}">
                            <span>${this.#evolution.from.name}</span>
                        </div>
                        <div class="evolution-modal__arrow">&rarr;</div>
                        <div class="evolution-modal__pokemon">
                            <img src="${this.#evolution.to.image}" alt="${this.#evolution.to.name}">
                            <span>${this.#evolution.to.name}</span>
                        </div>
                    </div>
                    ${learnedMoveText}
                    <button class="btn btn--primary" id="evolution-close">${t('evolution.ok')}</button>
                </div>
            </div>
        `;
    }

    #close() {
        if (this.#onClose) {
            this.#onClose();
        }
    }
}
