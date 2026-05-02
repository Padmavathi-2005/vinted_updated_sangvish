import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../utils/axios';
import { getAdminInfo } from '../utils/auth';
import en from '../locales/en.json';

const LocalizationContext = createContext();

export const LocalizationProvider = ({ children }) => {
    const [language, setLanguage] = useState(localStorage.getItem('adminLanguage') || 'en');
    const [currency, setCurrency] = useState(localStorage.getItem('adminCurrency') || 'USD');
    const [availableLanguages, setAvailableLanguages] = useState([]);
    const [availableCurrencies, setAvailableCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [translations, setTranslations] = useState(en);

    const adminInfo = getAdminInfo();
    const adminId = adminInfo?._id;

    useEffect(() => {
        const fetchSettings = async () => {
            const currentAdmin = getAdminInfo();
            if (!currentAdmin) {
                // Return defaults if not logged in to prevent 401s
                setAvailableLanguages([
                    { name: 'English', code: 'en', native_name: 'English', is_active: true }
                ]);
                setAvailableCurrencies([
                    { name: 'US Dollar', code: 'USD', symbol: '$', exchange_rate: 1, decimal_places: 2, is_active: true }
                ]);
                setLoading(false);
                return;
            }

            try {
                const [langRes, currRes] = await Promise.all([
                    axios.get('/api/admin/languages'),
                    axios.get('/api/admin/currencies')
                ]);

                const activeLangs = Array.isArray(langRes.data) && langRes.data.length > 0
                    ? langRes.data.filter(l => l.is_active)
                    : [
                        { name: 'English', code: 'en', native_name: 'English', is_active: true }
                    ];

                const activeCurrs = Array.isArray(currRes.data) && currRes.data.length > 0
                    ? currRes.data.filter(c => c.is_active)
                    : [
                        { name: 'US Dollar', code: 'USD', symbol: '$', exchange_rate: 1, decimal_places: 2, is_active: true }
                    ];

                setAvailableLanguages(activeLangs);
                setAvailableCurrencies(activeCurrs);
            } catch (error) {
                console.error("Error fetching localization settings", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();

        // Listen for storage changes (like login in another tab or after redirect)
        const handleStorageChange = (e) => {
            if (e.key === 'admin') {
                fetchSettings();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [adminId]);

    useEffect(() => {
        const loadTranslations = async () => {
            if (language === 'en') {
                setTranslations(en);
                return;
            }
            try {
                // Vite compatible dynamic import for JSON files
                const locales = import.meta.glob('../locales/*.json');
                const loadFile = locales[`../locales/${language}.json`];

                if (loadFile) {
                    const messages = await loadFile();
                    setTranslations(messages.default || messages);
                } else {
                    console.warn(`Translation file for ${language} not found.`);
                    setTranslations(en);
                }
            } catch (err) {
                console.warn(`Could not load translations for ${language}`, err);
                setTranslations(en); // Fallback to EN
            }
        };
        loadTranslations();

        // Also update initial direction
        const langObj = availableLanguages.find(l => l.code === language);
        if (langObj) {
            document.documentElement.dir = langObj.direction || 'ltr';
        }
    }, [language, availableLanguages]);

    const changeLanguage = (code) => {
        setLanguage(code);
        localStorage.setItem('adminLanguage', code);
        
        // Find the language object to get direction
        const langObj = availableLanguages.find(l => l.code === code);
        if (langObj) {
            document.documentElement.dir = langObj.direction || 'ltr';
        }
    };

    const changeCurrency = (code) => {
        setCurrency(code);
        localStorage.setItem('adminCurrency', code);
    };

    const formatPrice = (amount) => {
        const curr = availableCurrencies.find(c => c.code === currency);
        if (!curr) return `${amount} ${currency}`;

        const converted = amount * curr.exchange_rate;
        const formatted = converted.toFixed(curr.decimal_places);

        if (curr.symbol_position === 'before') {
            return `${curr.symbol}${formatted}`;
        } else {
            return `${formatted}${curr.symbol}`;
        }
    };

    const t = (path, params = {}) => {
        const keys = path.split('.');
        let result = translations;
        for (const key of keys) {
            if (!result || result[key] === undefined) return path;
            result = result[key];
        }

        if (typeof result === 'string' && params) {
            Object.keys(params).forEach(key => {
                result = result.replace(`{${key}}`, params[key]);
            });
        }

        return result || path;
    };

    return (
        <LocalizationContext.Provider value={{
            language,
            currency,
            availableLanguages,
            availableCurrencies,
            changeLanguage,
            changeCurrency,
            formatPrice,
            t,
            loading
        }}>
            {children}
        </LocalizationContext.Provider>
    );
};

export const useLocalization = () => useContext(LocalizationContext);
