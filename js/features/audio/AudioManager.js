/* js/features/audio/AudioManager.js */
import { mergeAudioSources } from './audioSources.js';

function clampVolume(value, fallback) {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(1, Math.max(0, value));
}

function createSilentTrack(src = '') {
    return {
        src,
        loop: false,
        preload: 'auto',
        volume: 0,
        currentTime: 0,
        paused: true,
        play() {
            this.paused = false;
            return Promise.resolve();
        },
        pause() {
            this.paused = true;
        }
    };
}

export class AudioManager {
    #enabled = true;
    #unlocked = false;
    #musicVolume = 0.4;
    #effectsVolume = 0.7;
    #targetMode = 'background';
    #currentMusic = null;
    #status = 'idle';

    #sources;
    #musicTracks = {};
    #sfxTracks = {};
    #audioFactory;

    constructor(options = {}) {
        this.#audioFactory = options.audioFactory || ((src) => {
            if (typeof Audio === 'undefined') {
                return createSilentTrack(src);
            }

            return new Audio(src);
        });
        this.#sources = mergeAudioSources(options.sources || {});
        this.#loadTracks();
    }

    init(options = {}) {
        this.#enabled = options.enabled !== undefined ? Boolean(options.enabled) : this.#enabled;
        this.#musicVolume = clampVolume(options.musicVolume, this.#musicVolume);
        this.#effectsVolume = clampVolume(options.effectsVolume, this.#effectsVolume);

        if (options.sources) {
            this.configureSources(options.sources);
        }

        this.#applyVolumes();
        this.#status = this.#enabled ? 'waiting_interaction' : 'disabled';
    }

    configureSources(sources = {}) {
        this.stopAll();
        this.#sources = mergeAudioSources(sources);
        this.#loadTracks();
        this.#applyVolumes();
    }

    activateFromUserAction() {
        this.#unlocked = true;
        if (!this.#enabled) {
            this.#status = 'disabled';
            return;
        }

        this.#status = 'ready';
        this.#applyMusicMode();
    }

    isUnlocked() {
        return this.#unlocked;
    }

    setEnabled(enabled) {
        this.#enabled = Boolean(enabled);

        if (!this.#enabled) {
            this.stopAll();
            this.#status = 'disabled';
            return;
        }

        this.#status = this.#unlocked ? 'ready' : 'waiting_interaction';
        if (this.#unlocked) {
            this.#applyMusicMode();
        }
    }

    getEnabled() {
        return this.#enabled;
    }

    setMusicVolume(value) {
        this.#musicVolume = clampVolume(value, this.#musicVolume);
        this.#applyVolumes();
    }

    setEffectsVolume(value) {
        this.#effectsVolume = clampVolume(value, this.#effectsVolume);
        this.#applyVolumes();
    }

    getMusicVolume() {
        return this.#musicVolume;
    }

    getEffectsVolume() {
        return this.#effectsVolume;
    }

    getStatus() {
        return this.#status;
    }

    setMusicMode(mode) {
        this.#targetMode = mode === 'battle' ? 'battle' : 'background';
        this.#applyMusicMode();
    }

    playBackgroundMusic() {
        this.setMusicMode('background');
    }

    playBattleMusic() {
        this.setMusicMode('battle');
    }

    stopAll() {
        this.#pauseTrack(this.#musicTracks.background);
        this.#pauseTrack(this.#musicTracks.battle);
        Object.values(this.#sfxTracks).forEach((track) => this.#pauseTrack(track));
        this.#currentMusic = null;
    }

    playAttackSfx() {
        this.#playSfx('attack');
    }

    playVictorySfx() {
        this.#playSfx('victory');
    }

    playCaptureSfx() {
        this.#playSfx('capture');
    }

    #loadTracks() {
        this.#musicTracks = {
            background: this.#createTrack(this.#sources.music.background, true),
            battle: this.#createTrack(this.#sources.music.battle, true)
        };

        this.#sfxTracks = {
            attack: this.#createTrack(this.#sources.sfx.attack, false),
            victory: this.#createTrack(this.#sources.sfx.victory, false),
            capture: this.#createTrack(this.#sources.sfx.capture, false)
        };

        this.#currentMusic = null;
    }

    #createTrack(src, loop) {
        const track = this.#audioFactory(src);
        track.loop = loop;
        track.preload = 'auto';
        return track;
    }

    #applyVolumes() {
        if (this.#musicTracks.background) {
            this.#musicTracks.background.volume = this.#musicVolume;
        }

        if (this.#musicTracks.battle) {
            this.#musicTracks.battle.volume = this.#musicVolume;
        }

        Object.values(this.#sfxTracks).forEach((track) => {
            track.volume = this.#effectsVolume;
        });
    }

    #applyMusicMode() {
        if (!this.#enabled) {
            this.stopAll();
            return;
        }

        if (!this.#unlocked) {
            this.#status = 'waiting_interaction';
            return;
        }

        const nextTrack = this.#targetMode === 'battle'
            ? this.#musicTracks.battle
            : this.#musicTracks.background;

        if (this.#currentMusic === nextTrack && !nextTrack.paused) {
            return;
        }

        this.#pauseTrack(this.#musicTracks.background);
        this.#pauseTrack(this.#musicTracks.battle);
        this.#playTrack(nextTrack, this.#targetMode === 'battle' ? 'battle_music' : 'background_music');
        this.#currentMusic = nextTrack;
    }

    #playSfx(key) {
        if (!this.#enabled || !this.#unlocked) {
            return;
        }

        const track = this.#sfxTracks[key];
        if (!track) {
            return;
        }

        track.currentTime = 0;
        this.#playTrack(track, `sfx_${key}`);
    }

    #playTrack(track, successStatus) {
        try {
            const result = track.play();
            if (result && typeof result.then === 'function') {
                result.then(() => {
                    this.#status = successStatus;
                }).catch(() => {
                    this.#status = 'playback_blocked';
                });
                return;
            }

            this.#status = successStatus;
        } catch {
            this.#status = 'playback_error';
        }
    }

    #pauseTrack(track) {
        if (!track) {
            return;
        }

        track.pause();
        if (!track.loop) {
            track.currentTime = 0;
        }
    }
}

export const audioManager = new AudioManager();
