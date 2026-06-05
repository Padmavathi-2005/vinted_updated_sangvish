import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en/translation.json';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL === '/' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'https://vinted.sangvish.com');

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
