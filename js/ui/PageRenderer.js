/* js/ui/PageRenderer.js */
import { store } from '../state/store.js';
import { gameState } from '../state/GameState.js';
import { pokeApi } from '../api/pokeapi.js';
import { audioManager } from '../features/audio/index.js';
import { BattleEngine, getNextTeamIndex } from '../features/battle/index.js';
import { setLanguage, t } from '../i18n/index.js';
import { BattleView, EvolutionModal, GymView, HelpPanel, HomeScreen, LeagueView, PokemonDetail, ShopView, StarterSelection, TeamManagementView, TrainerNameModal } from './components/index.js';

export class PageRenderer {
    #detailOverlay = null;
    #evolutionOverlay = null;
    #trainerNameOverlay = null;
    #helpOverlay = null;
    #helpAutoOpened = false;
    #battleEngine = null;
    #battleView = null;
    #shopFeedback = '';
    #gymFeedback = '';
    #leagueFeedback = '';
    #teamBerryFeedback = '';
    #teamManagementFeedback = '';
    #battleContext = null;
    #battleParty = [];
    #battlePartyIndex = 0;

    init() {
        window.addEventListener('navigate', (e) => this.#onNavigate(e));
        window.addEventListener('languagechange', () => this.#onLanguageChange());
        this.#bindHelpButton();
        this.#refreshHelpButtonLabel();
    }

    #onLanguageChange() {
        this.#refreshHelpButtonLabel();
        const currentPage = store.get('currentPage') || 'home';
        if (currentPage === 'battle' && this.#battleEngine && this.#battleView) {
            this.#battleView.refreshLanguage(this.#battleEngine.getState());
        }

        if (this.#helpOverlay) {
            this.#showHelpPanel(true);
        }

        this.renderPage(currentPage);
    }

    #bindHelpButton() {
        const helpButton = document.getElementById('help-button');
        if (!helpButton) {
            return;
        }

        helpButton.addEventListener('click', () => this.#showHelpPanel());
    }

    #refreshHelpButtonLabel() {
        const helpButton = document.getElementById('help-button');
        if (helpButton) {
            helpButton.textContent = t('help.button');
        }
    }

    async renderPage(page) {
        this.#hideAllPages();
        this.#closeDetail();
        this.#closeEvolution();
        this.#closeTrainerName();
        store.set('currentPage', page);

        const pageEl = document.getElementById(`page-${page}`);
        if (!pageEl) {
            return;
        }

        switch (page) {
            case 'home':
                await this.#renderHome(pageEl);
                break;
            case 'starter':
                await this.#renderStarter(pageEl);
                break;
            case 'game':
                this.#renderGame(pageEl);
                break;
            case 'team':
                this.#renderTeam(pageEl);
                break;
            case 'gyms':
                this.#renderGyms(pageEl);
                break;
            case 'league':
                this.#renderLeague(pageEl);
                break;
            case 'shop':
                this.#renderShop(pageEl);
                break;
            case 'battle':
                await this.#renderBattle(pageEl);
                break;
            default:
                await this.#renderHome(pageEl);
                break;
        }

        pageEl.classList.remove('page--hidden');
        if (page === 'battle') {
            audioManager.playBattleMusic();
        } else {
            audioManager.playBackgroundMusic();
        }
        this.#maybeAutoTutorial(page);
    }

    #maybeAutoTutorial(page) {
        if (this.#helpAutoOpened || page !== 'home') {
            return;
        }

        const tutorialSeen = Boolean(store.get('helper.tutorialSeen'));
        if (!tutorialSeen) {
            this.#helpAutoOpened = true;
            this.#showHelpPanel();
            store.set('helper.tutorialSeen', true);
            store.save();
        }
    }

    async #renderHome(container) {
        const hasSave = store.hasSave();
        const trainerName = hasSave ? (gameState.getPlayer().name || '').trim() : '';
        const homeScreen = new HomeScreen(
            () => this.#handleNewGame(),
            () => this.#handleContinue(),
            trainerName
        );
        const content = homeScreen.render();

        const continueBtn = content.querySelector('#btn-continue');
        if (continueBtn) {
            continueBtn.disabled = !hasSave;
            continueBtn.style.opacity = hasSave ? '1' : '0.5';
        }

        container.innerHTML = '';
        container.appendChild(content);
    }

    async #handleNewGame() {
        audioManager.activateFromUserAction();
        store.newGame();
        this.#showTrainerNameSetup();
    }

    #showTrainerNameSetup() {
        this.#closeTrainerName();

        const modal = new TrainerNameModal((trainerName) => {
            gameState.updatePlayer({ name: trainerName });
            store.save();
            this.#closeTrainerName();
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'starter' } }));
        });

        this.#trainerNameOverlay = modal.render();
        document.body.appendChild(this.#trainerNameOverlay);
    }

    #handleContinue() {
        audioManager.activateFromUserAction();
        store.load();
        setLanguage(store.get('language') || 'es');
        audioManager.setEnabled(store.get('soundEnabled'));
        audioManager.setMusicVolume(store.get('musicVolume'));
        audioManager.setEffectsVolume(store.get('effectsVolume'));
        window.dispatchEvent(new CustomEvent('languagechange'));
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'game' } }));
    }

    async #renderStarter(container) {
        container.innerHTML = `<div class="loading">${t('common.loading')}</div>`;

        try {
            const pokemonPromises = [];
            for (let i = 0; i < 3; i += 1) {
                const id = Math.floor(Math.random() * 898) + 1;
                pokemonPromises.push(pokeApi.getPokemonWithMoves(id));
            }
            const pokemon = await Promise.all(pokemonPromises);

            const starterSelection = new StarterSelection(
                pokemon,
                () => {},
                (selected) => {
                    gameState.setCapturedCatalog([]);
                    gameState.setActiveTeamOrder([]);
                    gameState.addToCapturedCatalog(selected, { autoAddToTeam: true });
                    gameState.registerCaught(selected.id);
                    store.save();
                    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'game' } }));
                }
            );

            container.innerHTML = '';
            container.appendChild(starterSelection.render());
        } catch {
            container.innerHTML = `<div class="loading">${t('common.loading')}</div>`;
        }
    }

    #renderGame(container) {
        const team = gameState.getTeam();
        const player = gameState.getPlayer();
        const money = gameState.getMoney();
        const leagueUnlocked = gameState.isLeagueUnlocked();
        const leagueRequirement = gameState.getLeague().requiredBadges;
        const currentBadges = gameState.getGymProgress().earnedBadges.length;

        container.innerHTML = `
            <div class="game-screen">
                <h1>${t('game.welcome', { name: player.name })}</h1>
                <p>${t('game.teamCount', { count: team.length })}</p>
                <p>${t('game.money', { money })}</p>
                <p>${t('game.badges', { current: currentBadges, required: leagueRequirement })}</p>
                <div class="game-screen__actions">
                    <button class="btn btn--primary" id="btn-view-team">${t('game.viewTeam')}</button>
                    <button class="btn btn--secondary" id="btn-view-gyms">${t('game.viewGyms')}</button>
                    <button class="btn btn--secondary" id="btn-view-league" ${leagueUnlocked ? '' : 'disabled'}>${t('game.viewLeague')}</button>
                    <button class="btn btn--secondary" id="btn-view-shop">${t('game.viewShop')}</button>
                    <button class="btn btn--secondary" id="btn-start-battle" ${team.length === 0 ? 'disabled' : ''}>${t('game.startBattle')}</button>
                </div>
            </div>
        `;

        container.querySelector('#btn-view-team')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'team' } }));
        });

        container.querySelector('#btn-view-gyms')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'gyms' } }));
        });

        container.querySelector('#btn-view-league')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'league' } }));
        });

        container.querySelector('#btn-view-shop')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'shop' } }));
        });

        container.querySelector('#btn-start-battle')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'battle' } }));
        });
    }

    #renderTeam(container) {
        const activeTeam = gameState.getActiveTeam();
        const catalog = gameState.getCapturedCatalog();
        const teamView = new TeamManagementView({
            catalog,
            activeTeam,
            feedback: this.#teamManagementFeedback,
            onAdd: (instanceId) => this.#handleAddToActiveTeam(instanceId),
            onRemove: (instanceId) => this.#handleRemoveFromActiveTeam(instanceId),
            onMove: (instanceId, direction) => this.#handleMoveActiveTeam(instanceId, direction),
            onReplace: (slotIndex, instanceId) => this.#handleReplaceTeamMember(slotIndex, instanceId),
            onInspect: (instanceId) => this.#handleInspectTeamPokemon(instanceId)
        });
        container.innerHTML = '';
        container.appendChild(teamView.render());
    }

    #refreshTeamIfVisible() {
        const teamPage = document.getElementById('page-team');
        if (teamPage && !teamPage.classList.contains('page--hidden')) {
            this.#renderTeam(teamPage);
        }
    }

    #handleAddToActiveTeam(instanceId) {
        const result = gameState.addToActiveTeam(instanceId);
        this.#teamManagementFeedback = result.message;
        if (result.success) {
            store.save();
        }
        this.#refreshTeamIfVisible();
    }

    #handleRemoveFromActiveTeam(instanceId) {
        const result = gameState.removeFromActiveTeam(instanceId);
        this.#teamManagementFeedback = result.message;
        if (result.success) {
            store.save();
        }
        this.#refreshTeamIfVisible();
    }

    #handleMoveActiveTeam(instanceId, direction) {
        const result = gameState.moveActiveTeamMember(instanceId, direction);
        this.#teamManagementFeedback = result.message;
        if (result.success) {
            store.save();
        }
        this.#refreshTeamIfVisible();
    }

    #handleReplaceTeamMember(slotIndex, instanceId) {
        const result = gameState.replaceActiveTeamMember(slotIndex, instanceId);
        this.#teamManagementFeedback = result.message;
        if (result.success) {
            store.save();
        }
        this.#refreshTeamIfVisible();
    }

    #handleInspectTeamPokemon(instanceId) {
        const activeTeam = gameState.getActiveTeam();
        const teamIndex = activeTeam.findIndex((pokemon) => pokemon.instanceId === instanceId);
        if (teamIndex === -1) {
            return;
        }

        this.#showDetail(activeTeam[teamIndex], teamIndex);
    }

    #renderGyms(container) {
        const gyms = gameState.getGyms();
        const statuses = gyms.reduce((acc, gym) => {
            acc[gym.id] = gameState.getGymStatus(gym.id);
            return acc;
        }, {});

        const gymView = new GymView({
            gyms,
            statuses,
            feedback: this.#gymFeedback,
            onChallengeTrainer: (gymId) => this.#startGymTrainerBattle(gymId),
            onChallengeLeader: (gymId) => this.#startGymLeaderBattle(gymId)
        });

        container.innerHTML = '';
        container.appendChild(gymView.render());
    }

    #startGymTrainerBattle(gymId) {
        const gym = gameState.getGymById(gymId);
        const trainer = gameState.getNextGymTrainer(gymId);

        if (!gym || !trainer) {
            this.#gymFeedback = t('gym.allTrainersDone');
            this.#refreshGymsIfVisible();
            return;
        }

        this.#battleContext = {
            mode: 'gym-trainer',
            gymId,
            gymName: gym.name,
            opponentId: trainer.id,
            opponentName: trainer.name,
            opponentPokemon: trainer.pokemon,
            rewardMoney: trainer.rewardMoney,
            difficulty: 'normal'
        };

        this.#gymFeedback = t('gym.challenging', { name: trainer.name, gym: gym.name });
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'battle' } }));
    }

    #startGymLeaderBattle(gymId) {
        const gym = gameState.getGymById(gymId);
        const canFightLeader = gameState.canChallengeGymLeader(gymId);

        if (!gym || !canFightLeader) {
            this.#gymFeedback = t('gym.needTrainersFirst');
            this.#refreshGymsIfVisible();
            return;
        }

        this.#battleContext = {
            mode: 'gym-leader',
            gymId,
            gymName: gym.name,
            opponentId: gym.leader.id,
            opponentName: gym.leader.name,
            opponentPokemon: gym.leader.pokemon,
            rewardMoney: gym.leader.rewardMoney,
            badge: gym.badge,
            gymRewardMoney: gym.rewardMoney,
            difficulty: 'hard'
        };

        this.#gymFeedback = t('gym.leaderStart', { gym: gym.name });
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'battle' } }));
    }

    #refreshGymsIfVisible() {
        const gymPage = document.getElementById('page-gyms');
        if (gymPage && !gymPage.classList.contains('page--hidden')) {
            this.#renderGyms(gymPage);
        }
    }

    #renderLeague(container) {
        const league = gameState.getLeague();
        const status = gameState.getLeagueStatus();
        const badgeCount = gameState.getGymProgress().earnedBadges.length;

        if (!status.unlocked) {
            this.#leagueFeedback = t('league.locked', { required: league.requiredBadges, current: badgeCount });
        }

        const leagueView = new LeagueView({
            league,
            status,
            feedback: this.#leagueFeedback,
            onStart: () => this.#startLeagueBattle()
        });

        container.innerHTML = '';
        container.appendChild(leagueView.render());
    }

    #startLeagueBattle() {
        const status = gameState.getLeagueStatus();
        if (!status.unlocked) {
            this.#leagueFeedback = t('league.locked', {
                required: gameState.getLeague().requiredBadges,
                current: gameState.getGymProgress().earnedBadges.length
            });
            this.#refreshLeagueIfVisible();
            return;
        }

        const opponent = gameState.getNextLeagueOpponent();
        if (!opponent) {
            this.#leagueFeedback = t('league.completed');
            this.#refreshLeagueIfVisible();
            return;
        }

        this.#battleContext = {
            mode: 'league',
            opponentId: opponent.id,
            opponentName: opponent.name,
            opponentRole: opponent.role,
            opponentPokemon: opponent.pokemon,
            rewardMoney: opponent.rewardMoney,
            difficulty: opponent.role === 'champion' ? 'hard' : 'normal'
        };

        this.#leagueFeedback = t('league.challenge', { name: opponent.name });
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'battle' } }));
    }

    #refreshLeagueIfVisible() {
        const leaguePage = document.getElementById('page-league');
        if (leaguePage && !leaguePage.classList.contains('page--hidden')) {
            this.#renderLeague(leaguePage);
        }
    }

    #renderShop(container) {
        const shopView = new ShopView({
            money: gameState.getMoney(),
            inventory: gameState.getInventory(),
            items: gameState.getShopItems(),
            feedback: this.#shopFeedback,
            onBuy: (berryKey) => this.#handleBuyBerry(berryKey)
        });

        container.innerHTML = '';
        container.appendChild(shopView.render());
    }

    #handleBuyBerry(berryKey) {
        const result = gameState.buyBerry(berryKey, 1);
        const itemName = t(`berry.${berryKey}.name`) !== `berry.${berryKey}.name`
            ? t(`berry.${berryKey}.name`)
            : result.item?.name;
        this.#shopFeedback = result.success
            ? t('shop.purchased', { name: itemName || '', cost: result.totalCost })
            : result.message;

        if (result.success) {
            store.save();
        }

        const container = document.getElementById('page-shop');
        if (container && !container.classList.contains('page--hidden')) {
            this.#renderShop(container);
        }
    }

    async #renderBattle(container) {
        const activeTeam = gameState.getActiveTeam();
        if (activeTeam.length === 0) {
            container.innerHTML = `<div class="loading">${t('battle.needTeam')}</div>`;
            return;
        }

        container.innerHTML = `<div class="loading">${t('common.loading')}</div>`;
        try {
            const canCapture = this.#battleContext?.mode !== 'gym-trainer'
                && this.#battleContext?.mode !== 'gym-leader'
                && this.#battleContext?.mode !== 'league';
            this.#battleParty = activeTeam.map((pokemon) => ({ ...pokemon }));
            this.#battlePartyIndex = this.#findFirstAvailablePartyIndex();
            if (this.#battlePartyIndex === -1) {
                container.innerHTML = `<div class="loading">${t('battle.needTeam')}</div>`;
                return;
            }

            const initialBuffs = gameState.consumeNextBattleBuffs(this.#battlePartyIndex);

            const leadPokemon = this.#battleParty[this.#battlePartyIndex];
            const playerHp = leadPokemon.maxHp || leadPokemon.stats.find((stat) => stat.name === 'hp')?.value || 50;
            const playerPokemon = {
                ...leadPokemon,
                maxHp: playerHp,
                currentHp: Number.isFinite(leadPokemon.currentHp) ? leadPokemon.currentHp : playerHp,
                moves: (leadPokemon.moves || []).slice(0, 4)
            };
            const enemyPokemonData = this.#battleContext?.opponentPokemon;
            const adaptiveProfile = !this.#battleContext ? gameState.getAdaptiveEnemyProfile() : null;

            let enemyPokemon;
            if (enemyPokemonData?.id) {
                enemyPokemon = await pokeApi.getPokemonWithMoves(enemyPokemonData.id);
            } else if (adaptiveProfile?.counterType) {
                try {
                    enemyPokemon = await pokeApi.getRandomPokemonWithMovesByType(adaptiveProfile.counterType);
                } catch {
                    const enemyId = Math.floor(Math.random() * 898) + 1;
                    enemyPokemon = await pokeApi.getPokemonWithMoves(enemyId);
                }
            } else {
                const enemyId = Math.floor(Math.random() * 898) + 1;
                enemyPokemon = await pokeApi.getPokemonWithMoves(enemyId);
            }

            const enemyHp = enemyPokemon.stats.find((stat) => stat.name === 'hp')?.value || 50;
            const normalizedEnemy = {
                ...enemyPokemon,
                level: enemyPokemonData?.level || Math.max(
                    3,
                    playerPokemon.level + (adaptiveProfile?.levelOffset || 0) + Math.floor(Math.random() * 3) - 1
                ),
                maxHp: enemyHp,
                currentHp: enemyHp
            };

            this.#battleEngine = new BattleEngine();
            const initialState = this.#battleEngine.startBattle(playerPokemon, normalizedEnemy, {
                difficulty: this.#battleContext?.difficulty || adaptiveProfile?.enemyMode || 'normal',
                canCapture,
                initialPlayerBuffs: initialBuffs
            });
            this.#battleView = new BattleView(
                (moveIndex) => this.#handlePlayerMove(moveIndex),
                () => this.#handleCapture(),
                (berryKey) => this.#handleBattleBerryUse(berryKey),
                () => this.#getAvailableBattleBerries(),
                () => this.#exitBattle(),
                { canCapture }
            );

            container.innerHTML = '';
            container.appendChild(this.#battleView.render(initialState));
            if (this.#battleContext?.opponentName) {
                this.#battleView.update({
                    ...initialState,
                    message: t('battle.against', { name: this.#battleContext.opponentName })
                });
            } else if (adaptiveProfile) {
                this.#battleView.update({
                    ...initialState,
                    message: t('battle.wildProfile', { style: adaptiveProfile.playStyle })
                });
            }
        } catch {
            container.innerHTML = `<div class="loading">${t('common.loading')}</div>`;
        }
    }

    async #handlePlayerMove(moveIndex) {
        if (!this.#battleEngine || !this.#battleView) {
            return;
        }

        const currentState = this.#battleEngine.getState();
        const usedMove = currentState.player.moves[moveIndex];
        gameState.recordPlayerMove(usedMove);
        if (usedMove) {
            audioManager.playAttackSfx();
        }

        const playerResult = this.#battleEngine.executePlayerMove(moveIndex);
        this.#battleView.update(playerResult);

        if (playerResult.winner) {
            await this.#finishBattle(playerResult);
            return;
        }

        this.#queueEnemyTurn();
    }

    async #handleCapture() {
        if (!this.#battleEngine || !this.#battleView) {
            return;
        }

        const captureResult = this.#battleEngine.attemptCapture();
        gameState.recordCaptureAttempt(Boolean(captureResult.winner === 'captured'));
        this.#battleView.update(captureResult);

        if (captureResult.winner) {
            await this.#finishBattle(captureResult);
            return;
        }

        this.#queueEnemyTurn();
    }

    #getAvailableBattleBerries() {
        return gameState.getBerryInventoryList().filter((item) => item.quantity > 0);
    }

    async #handleBattleBerryUse(berryKey) {
        if (!this.#battleEngine || !this.#battleView) {
            return;
        }

        const berryResult = this.#battleEngine.usePlayerBerry(berryKey);
        this.#battleView.update(berryResult);

        if (!berryResult.berryConsumed) {
            return;
        }

        const consumed = gameState.consumeBerry(berryKey, 1);
        if (!consumed) {
            return;
        }

        store.save();

        if (berryResult.winner) {
            await this.#finishBattle(berryResult);
            return;
        }

        this.#queueEnemyTurn();
    }

    #queueEnemyTurn() {
        if (!this.#battleEngine || !this.#battleView) {
            return;
        }

        setTimeout(async () => {
            const enemyResult = this.#battleEngine.executeEnemyTurn();
            this.#battleView.update(enemyResult);

            if (enemyResult.winner) {
                if (enemyResult.winner === 'enemy') {
                    const switched = this.#switchToNextAvailablePokemon(enemyResult);
                    if (switched) {
                        return;
                    }
                }
                await this.#finishBattle(enemyResult);
            }
        }, 800);
    }

    #findFirstAvailablePartyIndex() {
        return this.#battleParty.findIndex((pokemon) => (pokemon.currentHp || 0) > 0);
    }

    #switchToNextAvailablePokemon(enemyResult) {
        if (!this.#battleEngine || !this.#battleView || this.#battleParty.length === 0) {
            return false;
        }

        const currentPokemon = this.#battleParty[this.#battlePartyIndex];
        if (currentPokemon) {
            this.#battleParty[this.#battlePartyIndex] = {
                ...currentPokemon,
                currentHp: enemyResult.player.currentHp,
                maxHp: enemyResult.player.maxHp
            };
        }

        const nextIndex = getNextTeamIndex(this.#battleParty, this.#battlePartyIndex);
        if (nextIndex === -1) {
            return false;
        }

        this.#battlePartyIndex = nextIndex;
        const nextPokemon = this.#battleParty[nextIndex];

        const initialState = this.#battleEngine.startBattle(
            {
                ...nextPokemon,
                currentHp: nextPokemon.currentHp,
                maxHp: nextPokemon.maxHp
            },
            {
                ...enemyResult.enemy,
                currentHp: enemyResult.enemy.currentHp,
                maxHp: enemyResult.enemy.maxHp
            },
            {
                difficulty: this.#battleContext?.difficulty || 'normal',
                canCapture: this.#battleContext?.mode !== 'gym-trainer'
                    && this.#battleContext?.mode !== 'gym-leader'
                    && this.#battleContext?.mode !== 'league',
                initialPlayerBuffs: gameState.consumeNextBattleBuffs(nextIndex)
            }
        );

        this.#battleView.update({
            ...initialState,
            message: t('battle.switchIn', {
                fainted: enemyResult.player.name,
                next: nextPokemon.name
            })
        });

        return true;
    }

    async #finishBattle(result) {
        if (this.#battleParty.length === 0) {
            return;
        }

        const activePokemon = this.#battleParty[this.#battlePartyIndex];
        if (activePokemon) {
            this.#battleParty[this.#battlePartyIndex] = {
                ...activePokemon,
                currentHp: result.player.currentHp,
                maxHp: result.player.maxHp
            };
        }

        gameState.applyBattleTeamState(this.#battleParty);

        if (result.winner === 'player') {
            gameState.recordBattleOutcome(true);
            audioManager.playVictorySfx();
            audioManager.playBackgroundMusic();
            const rewardMoney = this.#battleContext?.rewardMoney || 200;
            gameState.addMoney(rewardMoney);
            const progression = await gameState.addExp(this.#battleParty[this.#battlePartyIndex].instanceId, 60);
            if (progression?.evolution) {
                this.#showEvolution(progression.evolution, progression.learnedMove || null);
            }
            this.#battleView?.update({
                ...result,
                message: t('battle.reward', { money: rewardMoney }),
                captureChance: result.captureChance
            });

            if (this.#battleContext?.mode === 'gym-trainer') {
                gameState.markGymTrainerDefeated(this.#battleContext.gymId, this.#battleContext.opponentId);
                this.#gymFeedback = t('gym.trainerWin', {
                    name: this.#battleContext.opponentName,
                    gym: this.#battleContext.gymName
                });
            }

            if (this.#battleContext?.mode === 'gym-leader') {
                const badgeReward = gameState.markGymLeaderDefeated(this.#battleContext.gymId);
                if (badgeReward) {
                    gameState.addMoney(badgeReward.rewardMoney);
                    this.#gymFeedback = t('gym.leaderWin', {
                        badge: badgeReward.badge,
                        money: badgeReward.rewardMoney
                    });
                }
            }

            if (this.#battleContext?.mode === 'league') {
                gameState.markLeagueOpponentDefeated(this.#battleContext.opponentId);

                if (this.#battleContext.opponentRole === 'champion') {
                    gameState.markChampionDefeated();
                    this.#leagueFeedback = t('league.championYes');
                } else {
                    const nextOpponent = gameState.getNextLeagueOpponent();
                    this.#leagueFeedback = nextOpponent
                        ? t('league.next', { name: this.#battleContext.opponentName, next: nextOpponent.name })
                        : t('league.runComplete');
                }
            }
        }

        if (result.winner === 'captured') {
            const captureResult = gameState.capturePokemon(result.enemy);
            audioManager.playCaptureSfx();
            audioManager.playBackgroundMusic();
            const destinationText = captureResult.destination === 'team'
                ? t('battle.destination.team')
                : t('battle.destination.collection');
            this.#battleView?.update({
                ...result,
                message: t('battle.captureResult', { name: result.enemy.name, destination: destinationText }),
                captureChance: result.captureChance
            });
        }

        if (result.winner === 'enemy' && this.#battleContext) {
            gameState.recordBattleOutcome(false);
            audioManager.playBackgroundMusic();
            if (this.#battleContext.mode === 'gym-trainer' || this.#battleContext.mode === 'gym-leader') {
                this.#gymFeedback = t('gym.loss', { name: this.#battleContext.opponentName });
            }

            if (this.#battleContext.mode === 'league') {
                gameState.resetLeagueRun();
                this.#leagueFeedback = t('league.lossReset', { name: this.#battleContext.opponentName });
            }
        }

        if (result.winner === 'enemy' && !this.#battleContext) {
            gameState.recordBattleOutcome(false);
            audioManager.playBackgroundMusic();
        }

        store.save();
    }

    #exitBattle() {
        this.#battleEngine = null;
        this.#battleView = null;
        this.#battleParty = [];
        this.#battlePartyIndex = 0;
        audioManager.playBackgroundMusic();
        const returnPage = this.#battleContext?.mode === 'league'
            ? 'league'
            : (this.#battleContext ? 'gyms' : 'game');
        this.#battleContext = null;
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: returnPage } }));
    }

    #showDetail(pokemon, teamIndex = null) {
        this.#closeDetail();

        const detail = new PokemonDetail(pokemon, () => this.#closeDetail(), {
            feedback: this.#teamBerryFeedback,
            getBerries: () => gameState.getBerryInventoryList(),
            onUseBerry: async (berryKey) => {
                if (teamIndex === null) {
                    return;
                }

                const result = gameState.useBerryOnTeamPokemon(teamIndex, berryKey);
                this.#teamBerryFeedback = result.message;
                if (!result.success) {
                    this.#showDetail(pokemon, teamIndex);
                    return;
                }

                store.save();
                const updatedTeam = gameState.getTeam();
                this.#showDetail(updatedTeam[teamIndex], teamIndex);
            }
        });
        this.#detailOverlay = detail.render();
        document.body.appendChild(this.#detailOverlay);
    }

    #closeDetail() {
        if (this.#detailOverlay) {
            this.#detailOverlay.remove();
            this.#detailOverlay = null;
        }
        this.#teamBerryFeedback = '';
    }

    #showEvolution(evolution, learnedMove) {
        this.#closeEvolution();
        const modal = new EvolutionModal(evolution, learnedMove, () => this.#closeEvolution());
        this.#evolutionOverlay = modal.render();
        document.body.appendChild(this.#evolutionOverlay);
    }

    #showHelpPanel(refresh = false) {
        if (refresh) {
            this.#closeHelpPanel();
        }

        if (this.#helpOverlay) {
            return;
        }

        const panel = new HelpPanel(() => this.#closeHelpPanel());
        this.#helpOverlay = panel.render();
        document.body.appendChild(this.#helpOverlay);
    }

    #closeHelpPanel() {
        if (this.#helpOverlay) {
            this.#helpOverlay.remove();
            this.#helpOverlay = null;
        }
    }

    #closeEvolution() {
        if (this.#evolutionOverlay) {
            this.#evolutionOverlay.remove();
            this.#evolutionOverlay = null;
        }
    }

    #closeTrainerName() {
        if (this.#trainerNameOverlay) {
            this.#trainerNameOverlay.remove();
            this.#trainerNameOverlay = null;
        }
    }

    #onNavigate(e) {
        this.renderPage(e.detail.page);
    }

    #hideAllPages() {
        document.querySelectorAll('.page').forEach((page) => page.classList.add('page--hidden'));
    }
}
