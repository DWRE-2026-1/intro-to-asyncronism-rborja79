/* js/ui/components/LeagueView.js */
import { t } from '../../i18n/index.js';

export class LeagueView {
    #league;
    #status;
    #onStart;
    #feedback;

    constructor({ league, status, onStart, feedback = '' }) {
        this.#league = league;
        this.#status = status;
        this.#onStart = onStart;
        this.#feedback = feedback;
    }

    render() {
        const container = document.createElement('div');
        const nextOpponent = this.#status.nextOpponent;
        const unlocked = this.#status.unlocked;
        const completed = this.#status.championDefeated;

        container.className = 'league-view';
        container.innerHTML = `
            <div class="league-view__header">
                <h1 class="league-view__title">${this.#league.name}</h1>
                <p class="league-view__subtitle">${t('league.subtitle')}</p>
                <p class="league-view__feedback">${this.#feedback}</p>
            </div>

            <div class="league-view__status">
                <p>${t('league.badgesRequired', { count: this.#league.requiredBadges })}</p>
                <p>${t('league.progress', { current: this.#status.defeatedCount, total: this.#status.totalOpponents })}</p>
                <p>${t('league.championState', { value: completed ? t('league.championYes') : t('league.championNo') })}</p>
                <p>${t('league.nextBattle', { name: nextOpponent ? nextOpponent.name : t('league.none') })}</p>
            </div>

            <button class="btn btn--primary" id="league-start" ${unlocked && nextOpponent ? '' : 'disabled'}>
                ${completed ? t('league.completed') : (nextOpponent ? t('league.challenge', { name: nextOpponent.name }) : t('league.none'))}
            </button>

            <div class="league-view__opponents">
                ${this.#league.opponents.map((opponent) => this.#renderOpponent(opponent)).join('')}
            </div>
        `;

        container.querySelector('#league-start')?.addEventListener('click', () => {
            if (this.#onStart && unlocked && nextOpponent) {
                this.#onStart(nextOpponent.id);
            }
        });

        return container;
    }

    #renderOpponent(opponent) {
        const defeated = this.#status.defeatedOpponents.includes(opponent.id);
        return `
            <article class="league-opponent ${defeated ? 'league-opponent--defeated' : ''}">
                <h2>${opponent.name}</h2>
                <p>${t('league.role', { value: opponent.role })}</p>
                <p>${t('league.reward', { value: opponent.rewardMoney })}</p>
                <p>${t('league.status', { value: defeated ? t('league.statusDefeated') : t('league.statusPending') })}</p>
            </article>
        `;
    }
}
