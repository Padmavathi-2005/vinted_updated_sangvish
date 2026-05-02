import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import '../i18n';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [languages, setLanguages] = useState([
        { _id: 'en', name: 'English', code: 'en', native_name: 'English' }
    ]);
    const [currentLanguage, setCurrentLanguage] = useState({ _id: 'en', name: 'English', code: 'en', native_name: 'English' });
    const [defaultLanguage, setDefaultLanguage] = useState(null);
    const [dynamicContent, setDynamicContent] = useState({});
    const [contentLoading, setContentLoading] = useState(true);
    const { i18n } = useTranslation();

    // Fetch languages and settings exactly once when app loads
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [settingsRes, languagesRes] = await Promise.all([
                    axios.get('/api/settings').catch(() => ({ data: null })),
                    axios.get('/api/languages').catch(() => ({ data: [] }))
                ]);

                // Fetch dynamic content for current active language (will be refined after setup)
                const storedLangCode = localStorage.getItem('user_language') || 'en';
                const contentRes = await axios.get(`/api/frontend-content/${storedLangCode}`).catch(() => ({ data: {} }));
                setDynamicContent(contentRes.data);
                setContentLoading(false);

                let defLanguage = null;
                if (settingsRes.data && settingsRes.data.default_language_id) {
                    defLanguage = settingsRes.data.default_language_id;
                    setDefaultLanguage(defLanguage);
                }

                if (Array.isArray(languagesRes.data)) {
                    setLanguages(languagesRes.data);
                }

                // Check local storage for user's preferred language
                const storedLanguageCode = localStorage.getItem('user_language');

                if (storedLanguageCode && Array.isArray(languagesRes.data)) {
                    const found = languagesRes.data.find(l => l.code === storedLanguageCode);
                    if (found) {
                        setCurrentLanguage(found);
                    } else if (defLanguage) {
                        setCurrentLanguage(defLanguage);
                    }
                } else if (defLanguage) {
                    setCurrentLanguage(defLanguage);
                } else if (Array.isArray(languagesRes.data) && languagesRes.data.length > 0) {
                    setCurrentLanguage(languagesRes.data[0]); // Fallback to first available
                }

            } catch (error) {
                console.error("Failed to fetch language data:", error);
            }
        };

        fetchInitialData();
    }, []);

    const setLanguage = async (language) => {
        setCurrentLanguage(language);
        localStorage.setItem('user_language', language.code);

        // Fetch new dynamic content for the new language
        try {
            const { data } = await axios.get(`/api/frontend-content/${language.code}`);
            setDynamicContent(data);
        } catch (error) {
            console.error('Failed to update dynamic content:', error);
        }

        // update i18next language mapped to our DB code structure
        let i18nCode = language.code;
        if (i18nCode === 'zh') i18nCode = 'zh-CN';
        i18n.changeLanguage(i18nCode);

        // Update document direction (RTL/LTR)
        const dir = language.direction || 'ltr';
        document.documentElement.dir = dir;
        localStorage.setItem('user_direction', dir);
    };

    const td = useCallback((key, fallback) => {
        // dynamic translate helper: td('home.hero_title', 'Fallback Text')
        const [section, field] = key.split('.');
        if (dynamicContent[section] && dynamicContent[section][field]) {
            return dynamicContent[section][field];
        }
        return fallback;
    }, [dynamicContent]);

    const ti = useCallback((key, fallback) => {
        // dynamic image helper: ti('home.hero_image', 'https://example.com/default.jpg')
        const [section, field] = key.split('.');
        const val = (dynamicContent[section] && dynamicContent[section][field]) || '';

        // Define ultimate fallback
        const absoluteNotFound = `${axios.defaults.baseURL}/images/site/not_found.png`;

        if (!val) {
            // If even fallback is empty, use not_found
            if (!fallback) return absoluteNotFound;
            return fallback;
        }

        if (val.startsWith('http')) return val;

        // Construct backend URL
        return `${axios.defaults.baseURL}/${val}`;
    }, [dynamicContent]);

    // Auto-update i18n when currentLanguage resolves on load
    useEffect(() => {
        if (currentLanguage) {
            let i18nCode = currentLanguage.code;
            if (i18nCode === 'zh') i18nCode = 'zh-CN';
            i18n.changeLanguage(i18nCode);

            // Update document direction
            const dir = currentLanguage.direction || 'ltr';
            document.documentElement.dir = dir;
        }
    }, [currentLanguage, i18n]);

    return (
        <LanguageContext.Provider value={{
            languages,
            currentLanguage,
            setLanguage,
            defaultLanguage,
            td,
            ti,
            dynamicContent,
            contentLoading
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageContext;
