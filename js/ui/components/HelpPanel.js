/* js/ui/components/HelpPanel.js */
import { t } from '../../i18n/index.js';

export class HelpPanel {
    #onClose;

    constructor(onClose) {
        this.#onClose = onClose;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'help-panel';
        container.innerHTML = this.#template();

        container.querySelector('.help-panel__backdrop')?.addEventListener('click', (event) => {
            if (event.target.classList.contains('help-panel__backdrop')) {
                this.#close();
            }
        });

        container.querySelector('#help-panel-close')?.addEventListener('click', () => this.#close());
        return container;
    }

    #template() {
        return `
            <div class="help-panel__backdrop">
                <aside class="help-panel__dialog">
                    <div class="help-panel__header">
                        <h2>${t('help.title')}</h2>
                        <button class="help-panel__close" id="help-panel-close" aria-label="${t('help.close')}">&times;</button>
                    </div>
                    <p class="help-panel__intro">${t('help.intro')}</p>
                    <div class="help-panel__sections">
                        ${this.#section('team')}
                        ${this.#section('training')}
                        ${this.#section('wild')}
                        ${this.#section('battle')}
                        ${this.#section('shop')}
                        ${this.#section('gyms')}
                        ${this.#section('league')}
                    </div>
                </aside>
            </div>
        `;
    }

    #section(key) {
        return `
            <section class="help-section">
                <h3 class="help-section__title">${t(`help.${key}.title`)}</h3>
                <p class="help-section__text">${t(`help.${key}.desc`)}</p>
                <ol class="help-section__steps">
                    <li>${t(`help.${key}.step1`)}</li>
                    <li>${t(`help.${key}.step2`)}</li>
                    <li>${t(`help.${key}.step3`)}</li>
                </ol>
            </section>
        `;
    }

    #close() {
        if (this.#onClose) {
            this.#onClose();
        }
    }
}
