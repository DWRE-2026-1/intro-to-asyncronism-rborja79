/* js/ui/components/TeamView.js */
import { t } from '../../i18n/index.js';
import { TeamCard } from './TeamCard.js';

export class TeamView {
    #team;
    #onPokemonClick;

    constructor(team, onPokemonClick = null) {
        this.#team = team;
        this.#onPokemonClick = onPokemonClick;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'team-view';
        container.innerHTML = `
            <h1 class="team-view__title">${t('team.title')}</h1>
            <p class="team-view__subtitle">${t('team.count', { count: this.#team.length })}</p>
            <div class="team-view__grid" id="team-grid"></div>
        `;

        const grid = container.querySelector('#team-grid');
        this.#team.forEach((pokemon, index) => {
            const card = new TeamCard(pokemon, (selectedPokemon) => {
                if (this.#onPokemonClick) {
                    this.#onPokemonClick(selectedPokemon, index);
                }
            });
            const cardEl = card.render();
            grid.appendChild(cardEl);
        });

        return container;
    }
}
