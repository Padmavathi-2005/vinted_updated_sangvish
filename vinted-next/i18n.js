import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import ar from './locales/ar/translation.json';
import bn from './locales/bn/translation.json';
import de from './locales/de/translation.json';
import es from './locales/es/translation.json';
import fr from './locales/fr/translation.json';
import hi from './locales/hi/translation.json';
import id from './locales/id/translation.json';
import it from './locales/it/translation.json';
import ja from './locales/ja/translation.json';
import ko from './locales/ko/translation.json';
import nl from './locales/nl/translation.json';
import pl from './locales/pl/translation.json';
import pt from './locales/pt/translation.json';
import ru from './locales/ru/translation.json';
import sv from './locales/sv/translation.json';
import ta from './locales/ta/translation.json';
import tr from './locales/tr/translation.json';
import ur from './locales/ur/translation.json';
import vi from './locales/vi/translation.json';
import zh from './locales/zh/translation.json';

const resources = {
    en: { translation: en },
    ar: { translation: ar },
    bn: { translation: bn },
    de: { translation: de },
    es: { translation: es },
    fr: { translation: fr },
    hi: { translation: hi },
    id: { translation: id },
    it: { translation: it },
    ja: { translation: ja },
    ko: { translation: ko },
    nl: { translation: nl },
    pl: { translation: pl },
    pt: { translation: pt },
    ru: { translation: ru },
    sv: { translation: sv },
    ta: { translation: ta },
    tr: { translation: tr },
    ur: { translation: ur },
    vi: { translation: vi },
    zh: { translation: zh },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false // react already safes from xss
    }
});

export default i18n;
