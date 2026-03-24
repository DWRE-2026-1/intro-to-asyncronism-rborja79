/* js/ui/components/TrainerNameModal.js */
import { t } from '../../i18n/index.js';

export class TrainerNameModal {
    #onConfirm;

    constructor(onConfirm) {
        this.#onConfirm = onConfirm;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'trainer-name-modal';
        container.innerHTML = `
            <div class="trainer-name-modal__backdrop">
                <div class="trainer-name-modal__dialog">
                    <h2 class="trainer-name-modal__title">${t('trainer.modalTitle')}</h2>
                    <form class="trainer-name-modal__form" id="trainer-name-form">
                        <input
                            class="trainer-name-modal__input"
                            id="trainer-name-input"
                            type="text"
                            maxlength="20"
                            autocomplete="off"
                            placeholder="${t('nav.trainer')}"
                        >
                        <p class="trainer-name-modal__feedback" id="trainer-name-feedback"></p>
                        <button class="btn btn--primary" id="trainer-name-confirm" type="submit" disabled>
                            ${t('common.confirm')}
                        </button>
                    </form>
                </div>
            </div>
        `;

        const form = container.querySelector('#trainer-name-form');
        const input = container.querySelector('#trainer-name-input');
        const feedback = container.querySelector('#trainer-name-feedback');
        const confirmButton = container.querySelector('#trainer-name-confirm');

        const validate = () => {
            const rawValue = input.value;
            const trimmedValue = rawValue.trim();

            if (!trimmedValue) {
                feedback.textContent = t('trainer.required');
                confirmButton.disabled = true;
                return null;
            }

            if (trimmedValue.length > 20) {
                feedback.textContent = t('trainer.max');
                confirmButton.disabled = true;
                return null;
            }

            feedback.textContent = '';
            confirmButton.disabled = false;
            return trimmedValue;
        };

        input.addEventListener('input', validate);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const validName = validate();
            if (!validName) {
                return;
            }

            if (this.#onConfirm) {
                this.#onConfirm(validName);
            }
        });

        setTimeout(() => input.focus(), 0);

        return container;
    }
}
