/* js/features/audio/audioSources.js */
export const DEFAULT_AUDIO_SOURCES = {
    music: {
        background: '/assets/audio/background.mp3',
        battle: '/assets/audio/battle.mp3'
    },
    sfx: {
        attack: '/assets/audio/attack.mp3',
        victory: '/assets/audio/victory.mp3',
        capture: '/assets/audio/capture.mp3'
    }
};

export function mergeAudioSources(customSources = {}) {
    return {
        music: {
            ...DEFAULT_AUDIO_SOURCES.music,
            ...(customSources.music || {})
        },
        sfx: {
            ...DEFAULT_AUDIO_SOURCES.sfx,
            ...(customSources.sfx || {})
        }
    };
}
