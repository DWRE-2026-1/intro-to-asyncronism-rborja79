/* js/ui/Navigation.js */
import { audioManager } from '../features/audio/index.js';
import { LEAGUE } from '../features/league/index.js';
import { getLanguage, setLanguage, t } from '../i18n/index.js';
import { store } from '../state/store.js';

export class Navigation {
    #navElement;
    #activeClass = 'nav__link--active';

    constructor() {
        this.#navElement = document.getElementById('nav-list');
    }

    init() {
        if (!this.#navElement) {
            return;
        }

        this.#navElement.addEventListener('click', (event) => this.#handleNavClick(event));
        this.#bindLanguageSelector();
        this.#bindAudioControls();
        this.#updateVisibility();

        store.subscribe(() => this.#updateVisibility());
        window.addEventListener('languagechange', () => this.#updateVisibility());
    }

    #bindLanguageSelector() {
        const selector = document.getElementById('language-select');
        if (!selector) {
            return;
        }

        selector.value = getLanguage();
        selector.addEventListener('change', () => {
            const nextLanguage = selector.value;
            setLanguage(nextLanguage);
            store.set('language', nextLanguage);
            store.save();
            window.dispatchEvent(new CustomEvent('languagechange'));
        });
    }

    #bindAudioControls() {
        const toggle = document.getElementById('sound-toggle');
        const musicVolume = document.getElementById('music-volume');
        const effectsVolume = document.getElementById('effects-volume');

        if (toggle) {
            toggle.addEventListener('click', () => {
                const nextEnabled = !audioManager.getEnabled();
                if (nextEnabled) {
                    audioManager.activateFromUserAction();
                }

                audioManager.setEnabled(nextEnabled);
                store.set('soundEnabled', nextEnabled);
                store.save();

                if (nextEnabled) {
                    const currentPage = store.get('currentPage') || 'home';
                    if (currentPage === 'battle') {
                        audioManager.playBattleMusic();
                    } else {
                        audioManager.playBackgroundMusic();
                    }
                }

                this.#updateVisibility();
            });
        }

        if (musicVolume) {
            musicVolume.addEventListener('input', () => {
                const value = Number(musicVolume.value);
                audioManager.setMusicVolume(value);
                store.set('musicVolume', value);
                store.save();
                this.#updateVisibility();
            });
        }

        if (effectsVolume) {
            effectsVolume.addEventListener('input', () => {
                const value = Number(effectsVolume.value);
                audioManager.setEffectsVolume(value);
                store.set('effectsVolume', value);
                store.save();
                this.#updateVisibility();
            });
        }
    }

    #handleNavClick(event) {
        const button = event.target.closest('[data-page]');
        if (!button) {
            return;
        }

        const page = button.dataset.page;
        store.set('currentPage', page);
        this.#setActiveNav(page);
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page } }));
    }

    #setActiveNav(page) {
        const buttons = this.#navElement.querySelectorAll('.nav__link');
        buttons.forEach((button) => {
            button.classList.toggle(this.#activeClass, button.dataset.page === page);
        });
    }

    #updateVisibility() {
        const hasSave = store.hasSave();
        const currentPage = store.get('currentPage') || 'home';
        const badgeCount = (store.get('gyms.earnedBadges') || []).length;
        const leagueUnlocked = badgeCount >= LEAGUE.requiredBadges;
        const trainerName = (store.get('player.name') || '').trim() || 'Trainer';

        const label = document.getElementById('language-select-label');
        const selector = document.getElementById('language-select');
        const toggle = document.getElementById('sound-toggle');
        const musicLabel = document.getElementById('music-volume-label');
        const effectsLabel = document.getElementById('effects-volume-label');
        const musicVolume = document.getElementById('music-volume');
        const effectsVolume = document.getElementById('effects-volume');
        const audioStatus = document.getElementById('audio-status');

        if (label) {
            label.textContent = t('nav.language');
        }

        if (selector) {
            selector.value = store.get('language') || getLanguage();
        }

        if (musicLabel) {
            musicLabel.textContent = t('nav.musicVolume');
        }

        if (effectsLabel) {
            effectsLabel.textContent = t('nav.effectsVolume');
        }

        if (musicVolume) {
            musicVolume.value = String(audioManager.getMusicVolume());
        }

        if (effectsVolume) {
            effectsVolume.value = String(audioManager.getEffectsVolume());
        }

        if (toggle) {
            const enabled = audioManager.getEnabled();
            toggle.textContent = `${t('nav.sound')}: ${enabled ? t('nav.soundOn') : t('nav.soundOff')}`;
            if (musicVolume) {
                musicVolume.disabled = !enabled;
            }
            if (effectsVolume) {
                effectsVolume.disabled = !enabled;
            }
        }

        if (audioStatus) {
            const status = audioManager.getStatus();
            audioStatus.textContent = `${t('nav.audioStatus')}: ${t(`audio.status.${status}`)}`;
        }

        const texts = {
            home: t('nav.home'),
            game: t('nav.game'),
            team: t('nav.team'),
            gyms: t('nav.gyms'),
            league: t('nav.league'),
            shop: t('nav.shop')
        };

        this.#navElement.querySelector('[data-page="home"]')?.replaceChildren(texts.home);
        this.#navElement.querySelector('[data-page="game"]')?.replaceChildren(texts.game);
        this.#navElement.querySelector('[data-page="team"]')?.replaceChildren(texts.team);
        this.#navElement.querySelector('[data-page="gyms"]')?.replaceChildren(texts.gyms);
        this.#navElement.querySelector('[data-page="league"]')?.replaceChildren(texts.league);
        this.#navElement.querySelector('[data-page="shop"]')?.replaceChildren(texts.shop);

        ['nav-game', 'nav-team', 'nav-gyms', 'nav-shop'].forEach((id) => {
            const nav = document.getElementById(id);
            if (nav) {
                nav.style.display = hasSave ? 'block' : 'none';
            }
        });

        const leagueNav = document.getElementById('nav-league');
        if (leagueNav) {
            leagueNav.style.display = hasSave && leagueUnlocked ? 'block' : 'none';
        }

        const navMeta = document.getElementById('nav-meta');
        const navTrainerName = document.getElementById('nav-trainer-name');
        if (navMeta) {
            navMeta.style.display = hasSave ? 'flex' : 'none';
        }
        if (navTrainerName) {
            navTrainerName.textContent = trainerName;
        }

        const trainerLabel = document.querySelector('.nav__trainer-label');
        if (trainerLabel) {
            trainerLabel.textContent = `${t('nav.trainer')}:`;
        }

        this.#setActiveNav(currentPage);
    }
}
