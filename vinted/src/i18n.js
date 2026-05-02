import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Use Vite's glob import to automatically load all translation.json files
const modules = import.meta.glob('./locales/*/translation.json', { eager: true });

const resources = {};
Object.keys(modules).forEach((path) => {
    // path format: './locales/en/translation.json'
    const lang = path.split('/')[2];
    resources[lang] = {
        translation: modules[path].default || modules[path]
    };
});

i18n.use(initReactI18next).init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false // react already safes from xss
    }
});

export default i18n;
