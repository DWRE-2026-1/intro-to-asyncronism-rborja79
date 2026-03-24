/* js/ui/components/TeamCard.js */
export class TeamCard {
    #pokemon;
    #onClick;
    #showMoves;

    constructor(pokemon, onClick = null, showMoves = true) {
        this.#pokemon = pokemon;
        this.#onClick = onClick;
        this.#showMoves = showMoves;
    }

    render() {
        const card = document.createElement('div');
        card.className = `team-card${this.#onClick ? ' team-card--clickable' : ''}`;
        card.innerHTML = this.#getTemplate();

        if (this.#onClick) {
            card.addEventListener('click', () => this.#onClick(this.#pokemon));
        }

        return card;
    }

    #getTemplate() {
        const expForNext = this.#expForNextLevel(this.#pokemon.level);
        const expProgress = (this.#pokemon.exp / expForNext) * 100;
        const primaryType = this.#pokemon.types[0];

        return `
            <div class="team-card__header">
                <div class="team-card__info">
                    <span class="team-card__id">#${String(this.#pokemon.id).padStart(3, '0')}</span>
                    <h3 class="team-card__name">${this.#pokemon.name}</h3>
                </div>
                <div class="team-card__level">
                    <span class="team-card__level-label">Lv</span>
                    <span class="team-card__level-value">${this.#pokemon.level}</span>
                </div>
            </div>
            <div class="team-card__image-container team-card__image-container--${primaryType}">
                <img class="team-card__image" src="${this.#pokemon.image}" alt="${this.#pokemon.name}">
            </div>
            <div class="team-card__types">
                ${this.#pokemon.types.map(type => `
                    <span class="team-card__type team-card__type--${type}">${type}</span>
                `).join('')}
            </div>
            ${this.#showMoves && this.#pokemon.moves ? `
                <div class="team-card__moves">
                    ${this.#pokemon.moves.slice(0, 4).map(move => this.#renderMove(move)).join('')}
                </div>
            ` : ''}
            <div class="team-card__exp">
                <div class="team-card__exp-label">
                    <span>EXP</span>
                    <span>${this.#pokemon.exp} / ${expForNext}</span>
                </div>
                <div class="team-card__exp-bar">
                    <div class="team-card__exp-fill" style="width: ${expProgress}%"></div>
                </div>
            </div>
            <div class="team-card__stats">
                ${this.#pokemon.stats.map(stat => this.#renderStat(stat)).join('')}
            </div>
        `;
    }

    #renderMove(move) {
        return `
            <span class="team-card__move team-card__move--${move.type}">${move.name}</span>
        `;
    }

    #renderStat(stat) {
        const statMap = {
            'hp': { name: 'HP', color: '#ff5959' },
            'attack': { name: 'ATK', color: '#f5ac78' },
            'defense': { name: 'DEF', color: '#fae078' },
            'special-attack': { name: 'SP.ATK', color: '#9db7f5' },
            'special-defense': { name: 'SP.DEF', color: '#a7db8d' },
            'speed': { name: 'SPD', color: '#fa92b2' }
        };

        const statKey = stat.name.toLowerCase();
        const config = statMap[statKey] || { name: stat.name.toUpperCase(), color: '#888' };
        const percentage = Math.min((stat.value / 255) * 100, 100);

        return `
            <div class="team-card__stat">
                <span class="team-card__stat-name">${config.name}</span>
                <span class="team-card__stat-value">${stat.value}</span>
                <div class="team-card__stat-bar">
                    <div class="team-card__stat-fill" style="width: ${percentage}%; background: ${config.color}"></div>
                </div>
            </div>
        `;
    }

    #expForNextLevel(level) {
        return Math.floor(100 * Math.pow(1.2, level - 1));
    }
}
