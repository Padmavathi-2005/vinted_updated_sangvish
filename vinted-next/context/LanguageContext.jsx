'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from '@/utils/axios';
import '@/i18n';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [languages, setLanguages] = useState([
        { _id: 'en', name: 'English', code: 'en', native_name: 'English', direction: 'ltr' },
        { _id: 'ar', name: 'Arabic', code: 'ar', native_name: 'العربية', direction: 'rtl' },
        { _id: 'de', name: 'German', code: 'de', native_name: 'Deutsch', direction: 'ltr' },
        { _id: 'fr', name: 'French', code: 'fr', native_name: 'Français', direction: 'ltr' }
    ]);
    const [currentLanguage, setCurrentLanguage] = useState({ _id: 'en', name: 'English', code: 'en', native_name: 'English', direction: 'ltr' });
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

                // Filter to only include our supported 4 languages
                const supportedCodes = ['en', 'ar', 'de', 'fr'];
                let filteredLangs = [
                    { _id: 'en', name: 'English', code: 'en', native_name: 'English', direction: 'ltr' },
                    { _id: 'ar', name: 'Arabic', code: 'ar', native_name: 'العربية', direction: 'rtl' },
                    { _id: 'de', name: 'German', code: 'de', native_name: 'Deutsch', direction: 'ltr' },
                    { _id: 'fr', name: 'French', code: 'fr', native_name: 'Français', direction: 'ltr' }
                ];

                if (Array.isArray(languagesRes.data) && languagesRes.data.length > 0) {
                    // Update metadata if backend has more accurate data, but keep only the 4 codes
                    const fromBackend = languagesRes.data.filter(l => supportedCodes.includes(l.code));
                    if (fromBackend.length > 0) {
                        filteredLangs = fromBackend;
                    }
                }
                setLanguages(filteredLangs);

                // Determine default language from settings or fallback to English
                const defLanguage = filteredLangs.find(l => l.code === (settingsRes.data?.default_language || 'en')) || filteredLangs[0];
                setDefaultLanguage(defLanguage);

                // Check local storage for user's preferred language
                const storedLanguageCode = typeof window !== 'undefined' ? localStorage.getItem('user_language') : null;

                if (storedLanguageCode) {
                    const found = filteredLangs.find(l => l.code === storedLanguageCode);
                    if (found) {
                        setCurrentLanguage(found);
                    } else if (defLanguage) {
                        setCurrentLanguage(defLanguage);
                    }
                } else if (defLanguage) {
                    setCurrentLanguage(defLanguage);
                } else if (filteredLangs.length > 0) {
                    setCurrentLanguage(filteredLangs[0]); // Fallback to first available
                }

            } catch (error) {
                console.error("Failed to fetch language data:", error);
            }
        };

        fetchInitialData();
    }, []);

    const setLanguage = async (language) => {
        setCurrentLanguage(language);
        if (typeof window !== 'undefined') {
            localStorage.setItem('user_language', language.code);
        }

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
        if (typeof document !== 'undefined') {
            document.documentElement.dir = dir;
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('user_direction', dir);
        }
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
            if (typeof document !== 'undefined') {
                document.documentElement.dir = dir;
            }
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
