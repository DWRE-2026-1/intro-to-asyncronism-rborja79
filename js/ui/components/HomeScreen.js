/* js/ui/components/HomeScreen.js */
import { t } from '../../i18n/index.js';

export class HomeScreen {
    #onNewGame;
    #onContinue;
    #trainerName;

    constructor(onNewGame, onContinue, trainerName = '') {
        this.#onNewGame = onNewGame;
        this.#onContinue = onContinue;
        this.#trainerName = trainerName;
    }

    render() {
        const welcomeText = this.#trainerName
            ? `<p class="home-screen__welcome">${t('home.welcome', { name: this.#trainerName })}</p>`
            : '';

        const container = document.createElement('div');
        container.className = 'home-screen';
        container.innerHTML = `
            <div class="home-screen__content">
                <h1 class="home-screen__title">${t('home.title')}</h1>
                ${welcomeText}
                <p class="home-screen__subtitle">${t('home.subtitle')}</p>
                <div class="home-screen__buttons">
                    <button class="btn btn--primary" id="btn-new-game">${t('home.newGame')}</button>
                    <button class="btn btn--secondary" id="btn-continue">${t('home.continue')}</button>
                </div>
            </div>
        `;

        container.querySelector('#btn-new-game').addEventListener('click', () => {
            if (this.#onNewGame) this.#onNewGame();
        });

        container.querySelector('#btn-continue').addEventListener('click', () => {
            if (this.#onContinue) this.#onContinue();
        });

        return container;
    }
}
