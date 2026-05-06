'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from '@/utils/axios';
import { getImageUrl, safeString } from '@/utils/constants';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        site_name: '',
        site_url: '',
        site_logo: '',
        primary_color: '#0ea5e9',
        loading: true
    });

    useEffect(() => {
        // Try to get cached settings from localStorage for instant load
        const cachedSettings = JSON.parse(localStorage.getItem('site_settings') || 'null');
        if (cachedSettings) {
             setSettings(prev => ({ ...prev, ...cachedSettings, loading: true }));
        }

        const fetchSettings = async () => {
            console.log('[DEBUG] Fetching Settings from:', axios.defaults.baseURL + '/api/settings');
            try {
                const { data } = await axios.get('/api/settings');
                console.log('[DEBUG] Settings Data Received:', data ? 'YES' : 'NO', data?.site_name);
                if (data) {
                    const updatedSettings = {
                        ...data,
                        site_url: data.site_url || window.location.origin,
                        loading: false
                    };
                    setSettings(updatedSettings);
                    
                    // Cache the settings for the next visit
                    localStorage.setItem('site_settings', JSON.stringify(updatedSettings));
                    
                    // Set CSS variable globally
                    if (data.primary_color) {
                        document.documentElement.style.setProperty('--primary-color', data.primary_color);
                    }

                    // Dynamic Font Loading - Disabled as per request to use system-ui always
                    document.documentElement.style.setProperty('--body-font', 'system-ui, -apple-system, sans-serif');



                    if (data.site_favicon || data.favicon) {
                        const faviconString = safeString(data.site_favicon || data.favicon);
                        let link = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement('link');
                            link.rel = 'icon';
                            document.head.appendChild(link);
                        }
                        link.href = faviconString.startsWith('http') ? faviconString : (faviconString.startsWith('images/') ? `${axios.defaults.baseURL}/${faviconString}` : getImageUrl(faviconString));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                setSettings(prev => ({ ...prev, loading: false }));
            }
        };

        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
