/* js/i18n/index.js */
let currentLanguage = 'es';
let dictionaries = {};

async function loadDictionary(language) {
    const url = new URL(`./locales/${language}.json`, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load locale: ${language}`);
    }
    return response.json();
}

export async function initI18n(language = 'es') {
    const [es, en] = await Promise.all([
        loadDictionary('es'),
        loadDictionary('en')
    ]);

    dictionaries = { es, en };
    currentLanguage = dictionaries[language] ? language : 'es';
}

export function setLanguage(language) {
    if (dictionaries[language]) {
        currentLanguage = language;
    }
}

export function getLanguage() {
    return currentLanguage;
}

export function t(key, params = {}) {
    const dictionary = dictionaries[currentLanguage] || {};
    const fallback = dictionaries.es || {};
    const template = dictionary[key] ?? fallback[key] ?? key;

    return String(template).replace(/{{\s*(\w+)\s*}}/g, (_, param) => {
        if (params[param] === undefined || params[param] === null) {
            return '';
        }
        return String(params[param]);
    });
}
