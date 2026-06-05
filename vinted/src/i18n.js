import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from '../backend/locales/en/translation.json';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL === '/' ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://vinted.sangvish.com');

// Custom backend to strictly prevent ANY network calls for 'en'
const customBackend = {
    type: 'backend',
    read(language, namespace, callback) {
        if (language.startsWith('en')) {
            callback(null, enTranslation);
        } else {
            fetch(`${apiBaseUrl}/api/locales/${language}/${namespace}.json`)
                .then(res => {
                    if (!res.ok) throw new Error('Not found');
                    return res.json();
                })
                .then(data => callback(null, data))
                .catch(err => callback(err, false));
        }
    }
};

i18n
    .use(customBackend)
    .use(initReactI18next)
    .init({
        lng: 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
