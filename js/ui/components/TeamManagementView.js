/* js/ui/components/TeamManagementView.js */
import { t } from '../../i18n/index.js';

function renderTypes(types = []) {
    return types.map((type) => `<span class="team-mgmt__type">${type}</span>`).join('');
}

function renderMoves(moves = []) {
    return moves.slice(0, 4).map((move) => `<span class="team-mgmt__move">${move.name}</span>`).join('');
}

export class TeamManagementView {
    #catalog;
    #activeTeam;
    #feedback;
    #onAdd;
    #onRemove;
    #onMove;
    #onReplace;
    #onInspect;

    constructor({ catalog, activeTeam, feedback = '', onAdd, onRemove, onMove, onReplace, onInspect }) {
        this.#catalog = catalog;
        this.#activeTeam = activeTeam;
        this.#feedback = feedback;
        this.#onAdd = onAdd;
        this.#onRemove = onRemove;
        this.#onMove = onMove;
        this.#onReplace = onReplace;
        this.#onInspect = onInspect;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'team-mgmt';
        container.innerHTML = `
            <div class="team-mgmt__header">
                <h1>${t('team.title')}</h1>
                <p>${this.#feedback}</p>
            </div>

            <section class="team-mgmt__active">
                <h2>${t('team.activeTitle')}</h2>
                <div class="team-mgmt__slots">
                    ${this.#renderSlots()}
                </div>
            </section>

            <section class="team-mgmt__catalog">
                <h2>${t('team.catalogTitle')}</h2>
                <div class="team-mgmt__catalog-grid">
                    ${this.#catalog.map((pokemon) => this.#renderCatalogCard(pokemon)).join('')}
                </div>
            </section>
        `;

        this.#bindEvents(container);
        return container;
    }

    #renderSlots() {
        const slotRows = [];
        for (let i = 0; i < 6; i += 1) {
            const pokemon = this.#activeTeam[i] || null;
            const replaceOptions = this.#catalog
                .filter((candidate) => {
                    if (pokemon && candidate.instanceId === pokemon.instanceId) {
                        return true;
                    }
                    return !this.#activeTeam.some((member) => member.instanceId === candidate.instanceId);
                })
                .map((candidate) => `<option value="${candidate.instanceId}" ${pokemon && candidate.instanceId === pokemon.instanceId ? 'selected' : ''}>${candidate.name}</option>`)
                .join('');

            slotRows.push(`
                <article class="team-mgmt__slot ${pokemon ? 'team-mgmt__slot--filled' : ''}">
                    <h3>${t('team.slot', { value: i + 1 })}</h3>
                    ${pokemon ? `
                        <button class="team-mgmt__inspect" data-inspect-instance="${pokemon.instanceId}">${pokemon.name}</button>
                        <div class="team-mgmt__slot-actions">
                            <button data-move-up="${pokemon.instanceId}" ${i === 0 ? 'disabled' : ''}>${t('team.up')}</button>
                            <button data-move-down="${pokemon.instanceId}" ${i >= this.#activeTeam.length - 1 ? 'disabled' : ''}>${t('team.down')}</button>
                            <button data-remove-instance="${pokemon.instanceId}">${t('team.remove')}</button>
                        </div>
                    ` : `<p>${t('team.emptySlot')}</p>`}
                    <div class="team-mgmt__replace">
                        <select data-replace-slot="${i}">
                            <option value="">${t('team.replace')}</option>
                            ${replaceOptions}
                        </select>
                    </div>
                </article>
            `);
        }

        return slotRows.join('');
    }

    #renderCatalogCard(pokemon) {
        const inTeam = this.#activeTeam.some((member) => member.instanceId === pokemon.instanceId);
        const teamFull = this.#activeTeam.length >= 6;
        const canAdd = !inTeam && !teamFull;

        return `
            <article class="team-mgmt__catalog-card">
                <img src="${pokemon.image}" alt="${pokemon.name}">
                <h3>${pokemon.name}</h3>
                <p>Lv.${pokemon.level}</p>
                <div class="team-mgmt__types">${renderTypes(pokemon.types)}</div>
                <div class="team-mgmt__stats">
                    ${pokemon.stats.map((stat) => `<span>${stat.name}: ${stat.value}</span>`).join('')}
                </div>
                <div class="team-mgmt__moves">${renderMoves(pokemon.moves)}</div>
                <button data-add-instance="${pokemon.instanceId}" ${canAdd ? '' : 'disabled'}>
                    ${inTeam ? t('team.inTeam') : t('team.add')}
                </button>
            </article>
        `;
    }

    #bindEvents(container) {
        container.querySelectorAll('[data-add-instance]').forEach((button) => {
            button.addEventListener('click', () => {
                if (this.#onAdd) {
                    this.#onAdd(button.dataset.addInstance);
                }
            });
        });

        container.querySelectorAll('[data-remove-instance]').forEach((button) => {
            button.addEventListener('click', () => {
                if (this.#onRemove) {
                    this.#onRemove(button.dataset.removeInstance);
                }
            });
        });

        container.querySelectorAll('[data-move-up]').forEach((button) => {
            button.addEventListener('click', () => {
                if (this.#onMove) {
                    this.#onMove(button.dataset.moveUp, 'up');
                }
            });
        });

        container.querySelectorAll('[data-move-down]').forEach((button) => {
            button.addEventListener('click', () => {
                if (this.#onMove) {
                    this.#onMove(button.dataset.moveDown, 'down');
                }
            });
        });

        container.querySelectorAll('[data-replace-slot]').forEach((select) => {
            select.addEventListener('change', () => {
                if (!select.value || !this.#onReplace) {
                    return;
                }

                this.#onReplace(Number(select.dataset.replaceSlot), select.value);
            });
        });

        container.querySelectorAll('[data-inspect-instance]').forEach((button) => {
            button.addEventListener('click', () => {
                if (this.#onInspect) {
                    this.#onInspect(button.dataset.inspectInstance);
                }
            });
        });
    }
}
