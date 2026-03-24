/* js/ui/components/GymView.js */
import { t } from '../../i18n/index.js';

export class GymView {
    #gyms;
    #statuses;
    #onChallengeTrainer;
    #onChallengeLeader;
    #feedback;

    constructor({ gyms, statuses, onChallengeTrainer, onChallengeLeader, feedback = '' }) {
        this.#gyms = gyms;
        this.#statuses = statuses;
        this.#onChallengeTrainer = onChallengeTrainer;
        this.#onChallengeLeader = onChallengeLeader;
        this.#feedback = feedback;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'gym-view';
        container.innerHTML = `
            <div class="gym-view__header">
                <h1 class="gym-view__title">${t('gym.title')}</h1>
                <p class="gym-view__feedback">${this.#feedback}</p>
            </div>
            <div class="gym-view__grid">
                ${this.#gyms.map((gym) => this.#renderGymCard(gym)).join('')}
            </div>
        `;

        container.querySelectorAll('[data-challenge-trainer]').forEach((button) => {
            button.addEventListener('click', () => {
                if (this.#onChallengeTrainer) {
                    this.#onChallengeTrainer(button.dataset.challengeTrainer);
                }
            });
        });

        container.querySelectorAll('[data-challenge-leader]').forEach((button) => {
            button.addEventListener('click', () => {
                if (this.#onChallengeLeader) {
                    this.#onChallengeLeader(button.dataset.challengeLeader);
                }
            });
        });

        return container;
    }

    #renderGymCard(gym) {
        const status = this.#statuses[gym.id];
        const nextTrainer = status?.nextTrainer;
        const trainersTotal = gym.trainers.length;
        const trainersDefeated = status?.defeatedTrainerIds.length || 0;
        const leaderReady = Boolean(status?.allTrainersDefeated && !status?.leaderDefeated);

        return `
            <article class="gym-card">
                <h2 class="gym-card__name">${gym.name}</h2>
                <p class="gym-card__meta">${t('gym.type')}: ${gym.type}</p>
                <p class="gym-card__meta">${t('gym.badge')}: ${gym.badge}</p>
                <p class="gym-card__progress">${t('gym.trainersDefeated', { current: trainersDefeated, total: trainersTotal })}</p>
                <p class="gym-card__progress">${t('gym.leaderStatus', { status: status?.leaderDefeated ? t('gym.statusDefeated') : t('gym.statusPending') })}</p>
                <div class="gym-card__actions">
                    <button class="btn btn--secondary" data-challenge-trainer="${gym.id}" ${nextTrainer ? '' : 'disabled'}>
                        ${nextTrainer ? t('gym.fightTrainer', { name: nextTrainer.name }) : t('gym.allTrainersDefeated')}
                    </button>
                    <button class="btn btn--primary" data-challenge-leader="${gym.id}" ${leaderReady ? '' : 'disabled'}>
                        ${t('gym.fightLeader')}
                    </button>
                </div>
            </article>
        `;
    }
}
