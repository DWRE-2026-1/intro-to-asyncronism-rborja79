/* js/main.js */
import { App } from './core/App.js';
import { audioManager } from './features/audio/index.js';
import { initI18n } from './i18n/index.js';
import { store } from './state/store.js';
import { Navigation } from './ui/Navigation.js';
import { PageRenderer } from './ui/PageRenderer.js';

const navigation = new Navigation();
const pageRenderer = new PageRenderer();
const app = new App(navigation, pageRenderer);

const savedRaw = localStorage.getItem('pokemon-arena-state');
let savedLanguage = store.get('language') || 'es';
let savedSoundEnabled = store.get('soundEnabled');
let savedMusicVolume = store.get('musicVolume');
let savedEffectsVolume = store.get('effectsVolume');
if (savedRaw) {
    try {
        const parsed = JSON.parse(savedRaw);
        if (typeof parsed.language === 'string') {
            savedLanguage = parsed.language;
            store.set('language', savedLanguage);
        }

        if (typeof parsed.soundEnabled === 'boolean') {
            savedSoundEnabled = parsed.soundEnabled;
            store.set('soundEnabled', savedSoundEnabled);
        }

        if (Number.isFinite(parsed.musicVolume)) {
            savedMusicVolume = parsed.musicVolume;
            store.set('musicVolume', savedMusicVolume);
        }

        if (Number.isFinite(parsed.effectsVolume)) {
            savedEffectsVolume = parsed.effectsVolume;
            store.set('effectsVolume', savedEffectsVolume);
        }
    } catch {
        // Ignore invalid saved payload
    }
}

await initI18n(savedLanguage);
audioManager.init({
    enabled: savedSoundEnabled,
    musicVolume: savedMusicVolume,
    effectsVolume: savedEffectsVolume,
    sources: typeof window !== 'undefined' && window.AUDIO_SOURCES ? window.AUDIO_SOURCES : undefined
});
app.init();
