/* js/ui/components/BattleView.js */
import { t } from '../../i18n/index.js';

export class BattleView {
    #container;
    #onMove;
    #onCapture;
    #onBerryUse;
    #getBerries;
    #onExit;
    #canCapture;

    constructor(onMove, onCapture, onBerryUse, getBerries, onExit, options = {}) {
        this.#onMove = onMove;
        this.#onCapture = onCapture;
        this.#onBerryUse = onBerryUse;
        this.#getBerries = getBerries;
        this.#onExit = onExit;
        this.#canCapture = options.canCapture !== false;
    }

    render(initialState) {
        this.#container = document.createElement('div');
        this.#container.className = 'battle-screen';
        this.#container.innerHTML = this.#template();
        this.update(initialState);

        this.#container.querySelector('#battle-exit')?.addEventListener('click', () => {
            if (this.#onExit) {
                this.#onExit();
            }
        });

        this.#container.querySelectorAll('[data-move-index]').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.moveIndex);
                if (this.#onMove) {
                    this.#onMove(index);
                }
            });
        });

        this.#container.querySelector('#battle-capture')?.addEventListener('click', () => {
            if (this.#onCapture) {
                this.#onCapture();
            }
        });

        this.#container.querySelector('#battle-open-berries')?.addEventListener('click', () => {
            this.#toggleBerryPanel();
        });

        return this.#container;
    }

    update(state) {
        if (!this.#container || !state) {
            return;
        }

        this.#setPokemonState('enemy', state.enemy);
        this.#setPokemonState('player', state.player);

        const status = this.#container.querySelector('.battle-screen__status-text');
        if (status) {
            const capturePercent = Math.round((state.captureChance || 0) * 100);
            status.textContent = `${state.message} ${t('battle.captureChance', { value: capturePercent })}`;
        }

        const log = this.#container.querySelector('.battle-screen__log-list');
        if (log) {
            log.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join('');
        }

        const isPlayerTurn = state.turn === 'player' && state.winner === null;
        this.#container.querySelectorAll('[data-move-index]').forEach((button, index) => {
            const move = state.player.moves[index];
            button.disabled = !isPlayerTurn || !move;

            if (move) {
                button.innerHTML = `
                            <span class="battle-move__name">${move.name}</span>
                            <span class="battle-move__meta">${move.type} | ${move.power} PWR | ${move.accuracy}% ACC</span>
                        `;
                button.className = `battle-move battle-move--${move.type}`;
            }
        });

        const captureButton = this.#container.querySelector('#battle-capture');
        if (captureButton) {
            captureButton.disabled = !this.#canCapture || !isPlayerTurn;
            captureButton.style.display = this.#canCapture ? 'inline-flex' : 'none';
        }

        const berryToggle = this.#container.querySelector('#battle-open-berries');
        if (berryToggle) {
            berryToggle.disabled = !isPlayerTurn;
        }

        this.#renderBerryButtons();

        const feedback = this.#container.querySelector('.battle-screen__feedback');
        if (feedback) {
            const isCaptureEvent = state.message.toLowerCase().includes('capture');
            feedback.textContent = isCaptureEvent ? state.message : '';
            if (!isCaptureEvent) {
                feedback.className = 'battle-screen__feedback';
            } else if (state.message.toLowerCase().includes('successful')) {
                feedback.className = 'battle-screen__feedback battle-screen__feedback--success';
            } else {
                feedback.className = 'battle-screen__feedback battle-screen__feedback--fail';
            }
        }
    }

    refreshLanguage(state) {
        if (!this.#container) {
            return;
        }

        const logTitle = this.#container.querySelector('.battle-screen__log h3');
        if (logTitle) {
            logTitle.textContent = t('battle.log');
        }

        const captureButton = this.#container.querySelector('#battle-capture');
        if (captureButton) {
            captureButton.textContent = t('battle.capture');
        }

        const exitButton = this.#container.querySelector('#battle-exit');
        if (exitButton) {
            exitButton.textContent = t('battle.exit');
        }

        const berryToggle = this.#container.querySelector('#battle-open-berries');
        if (berryToggle) {
            berryToggle.textContent = t('berry.use');
        }

        this.update(state);
    }

    #toggleBerryPanel() {
        const panel = this.#container.querySelector('#battle-berries-panel');
        if (!panel) {
            return;
        }

        const hidden = panel.classList.toggle('battle-berries--hidden');
        if (!hidden) {
            this.#renderBerryButtons();
        }
    }

    #renderBerryButtons() {
        const list = this.#container.querySelector('#battle-berries-list');
        if (!list) {
            return;
        }

        const berries = this.#getBerries ? this.#getBerries() : [];
        if (!berries || berries.length === 0) {
            list.innerHTML = `<p class="battle-berries__empty">${t('berry.none')}</p>`;
            return;
        }

        list.innerHTML = berries.map((berry) => {
            const effectKey = t(`berry.${berry.key}.effect`);
            return `
                <button class="battle-berry" data-berry-key="${berry.key}" type="button">
                    <span class="battle-berry__name">${berry.name}</span>
                    <span class="battle-berry__qty">x${berry.quantity}</span>
                    <span class="battle-berry__desc">${t('berry.effect', { value: effectKey })}</span>
                </button>
            `;
        }).join('');

        list.querySelectorAll('[data-berry-key]').forEach((button) => {
            button.addEventListener('click', () => {
                const berryKey = button.dataset.berryKey;
                if (this.#onBerryUse) {
                    this.#onBerryUse(berryKey);
                }
            });
        });
    }

    #setPokemonState(side, pokemon) {
        const name = this.#container.querySelector(`#battle-${side}-name`);
        const hpText = this.#container.querySelector(`#battle-${side}-hp`);
        const hpFill = this.#container.querySelector(`#battle-${side}-hp-fill`);
        const image = this.#container.querySelector(`#battle-${side}-image`);

        if (name) {
            name.textContent = `${pokemon.name} Lv.${pokemon.level}`;
        }

        if (hpText) {
            hpText.textContent = `${pokemon.currentHp} / ${pokemon.maxHp}`;
        }

        if (hpFill) {
            const percent = Math.max(0, (pokemon.currentHp / pokemon.maxHp) * 100);
            hpFill.style.width = `${percent}%`;
            hpFill.className = `battle-hp__fill ${this.#hpClass(percent)}`;
        }

        if (image) {
            image.src = pokemon.image;
            image.alt = pokemon.name;
        }
    }

    #hpClass(percent) {
        if (percent > 50) {
            return 'battle-hp__fill--high';
        }

        if (percent > 20) {
            return 'battle-hp__fill--medium';
        }

        return 'battle-hp__fill--low';
    }

    #template() {
        return `
            <div class="battle-arena">
                <section class="battle-pokemon battle-pokemon--enemy">
                    <div class="battle-pokemon__panel">
                        <h2 id="battle-enemy-name"></h2>
                        <div class="battle-hp">
                            <div class="battle-hp__track">
                                <div id="battle-enemy-hp-fill" class="battle-hp__fill"></div>
                            </div>
                            <span id="battle-enemy-hp" class="battle-hp__text"></span>
                        </div>
                    </div>
                    <img id="battle-enemy-image" class="battle-pokemon__sprite battle-pokemon__sprite--enemy" src="" alt="">
                </section>

                <section class="battle-pokemon battle-pokemon--player">
                    <img id="battle-player-image" class="battle-pokemon__sprite battle-pokemon__sprite--player" src="" alt="">
                    <div class="battle-pokemon__panel">
                        <h2 id="battle-player-name"></h2>
                        <div class="battle-hp">
                            <div class="battle-hp__track">
                                <div id="battle-player-hp-fill" class="battle-hp__fill"></div>
                            </div>
                            <span id="battle-player-hp" class="battle-hp__text"></span>
                        </div>
                    </div>
                </section>
            </div>

            <section class="battle-screen__status">
                <p class="battle-screen__status-text"></p>
            </section>

            <section class="battle-screen__moves">
                <button class="battle-move" data-move-index="0"></button>
                <button class="battle-move" data-move-index="1"></button>
                <button class="battle-move" data-move-index="2"></button>
                <button class="battle-move" data-move-index="3"></button>
            </section>

            <section class="battle-screen__log">
                <h3>${t('battle.log')}</h3>
                <ul class="battle-screen__log-list"></ul>
            </section>

            <div class="battle-screen__footer">
                <button class="btn btn--primary" id="battle-capture">${t('battle.capture')}</button>
                <button class="btn btn--secondary" id="battle-open-berries">${t('berry.use')}</button>
                <button class="btn btn--secondary" id="battle-exit">${t('battle.exit')}</button>
            </div>

            <section class="battle-berries battle-berries--hidden" id="battle-berries-panel">
                <h3>${t('berry.listTitle')}</h3>
                <div class="battle-berries__list" id="battle-berries-list"></div>
            </section>

            <p class="battle-screen__feedback"></p>
        `;
    }
}
