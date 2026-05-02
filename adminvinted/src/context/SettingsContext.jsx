import React, { createContext, useState, useContext, useEffect } from 'react';
import axios, { imageBaseURL } from '../utils/axios';
import { getAdminInfo } from '../utils/auth';
import { safeString } from '../utils/constants';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settingTypes, setSettingTypes] = useState([]);
    const [globalSettings, setGlobalSettings] = useState({
        paginationLimit: parseInt(localStorage.getItem('adminPaginationLimit')) || 10,
        paginationMode: localStorage.getItem('adminPaginationMode') || 'paginate',
        siteName: 'Resale Admin',
        siteLogo: '',
        defaultTheme: 'light'
    });
    const [loading, setLoading] = useState(true);

    const adminInfo = getAdminInfo();
    const adminId = adminInfo?._id;

    useEffect(() => {
        initializeSettings();

        const handleStorageChange = (e) => {
            if (e.key === 'admin') {
                initializeSettings();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [adminId]);

    const applyTheme = (settings) => {
        if (!settings) return;

        // Apply dark/light mode
        if (settings.default_theme) {
            document.documentElement.setAttribute('data-admin-theme', settings.default_theme);
        } else {
            document.documentElement.setAttribute('data-admin-theme', 'light');
        }

        if (settings.primary_color) {
            document.documentElement.style.setProperty('--primary-color', settings.primary_color);

            // Convert Hex to RGB for variants that use rgba()
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(settings.primary_color);
            if (result) {
                const r = parseInt(result[1], 16);
                const g = parseInt(result[2], 16);
                const b = parseInt(result[3], 16);
                document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
            }
        }

        // Apply Dynamic Fonts - Disabled as per request to use system-ui always
        document.body.style.fontFamily = `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`;


        if (settings.site_name) {
            document.title = `${safeString(settings.site_name)} Admin`;
        }

        if (settings.site_favicon || settings.favicon) {
            const faviconString = safeString(settings.site_favicon || settings.favicon);
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = faviconString.startsWith('http') ? faviconString : `${imageBaseURL.endsWith('/') ? imageBaseURL.slice(0, -1) : imageBaseURL}/${faviconString.startsWith('/') ? faviconString.substring(1) : faviconString}`;
        }
    };

    const initializeSettings = async () => {
        const adminInfo = getAdminInfo();
        if (!adminInfo) {
            setSettingTypes(['general_settings', 'site_settings']);
            setLoading(false);
            return;
        }

        try {
            // Get types for sidebar
            const { data: types } = await axios.get('/api/settings/types');
            setSettingTypes(Array.isArray(types) && types.length > 0 ? types : ['general_settings', 'site_settings']);

            // Get default settings (general and site)
            const [generalRes, siteRes] = await Promise.allSettled([
                axios.get('/api/settings/general_settings'),
                axios.get('/api/settings/site_settings')
            ]);

            const generalDefaults = generalRes.status === 'fulfilled' ? generalRes.value.data : {};
            const siteDefaults = siteRes.status === 'fulfilled' ? siteRes.value.data : {};

            const combinedDefaults = { ...generalDefaults, ...siteDefaults };

            if (Object.keys(combinedDefaults).length > 0) {
                const newSettings = {
                    ...globalSettings,
                    ...combinedDefaults,
                    paginationLimit: combinedDefaults.pagination_limit || globalSettings.paginationLimit,
                    paginationMode: combinedDefaults.pagination_mode || globalSettings.paginationMode,
                    siteName: combinedDefaults.site_name || globalSettings.siteName,
                    siteLogo: combinedDefaults.site_logo || globalSettings.siteLogo,
                    siteFavicon: combinedDefaults.site_favicon || globalSettings.siteFavicon,
                    defaultTheme: combinedDefaults.default_theme || globalSettings.defaultTheme,
                    imageNotFound: combinedDefaults.image_not_found || globalSettings.imageNotFound,
                    emptyTableImage: combinedDefaults.empty_table_image || globalSettings.emptyTableImage
                };
                setGlobalSettings(newSettings);
                applyTheme(combinedDefaults);

                if (combinedDefaults.pagination_limit) localStorage.setItem('adminPaginationLimit', combinedDefaults.pagination_limit);
                if (combinedDefaults.pagination_mode) localStorage.setItem('adminPaginationMode', combinedDefaults.pagination_mode);
            }
        } catch (error) {
            console.error("Error initializing settings", error);
            // Default type if failed
            setSettingTypes(['general_settings', 'site_settings']);
        } finally {
            setLoading(false);
        }
    };

    const getSettingsByType = async (type) => {
        try {
            const { data } = await axios.get(`/api/settings/${type}`);
            return data;
        } catch (error) {
            console.error(`Error fetching settings for ${type}`, error);
            return null;
        }
    };

    const updateSettingsByType = async (type, formData) => {
        try {
            const { data } = await axios.put(`/api/settings/${type}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // If we updated global ones, update global state too
            if (type === 'general_settings' || type === 'site_settings') {
                setGlobalSettings(prev => ({
                    ...prev,
                    ...data,
                    paginationLimit: data.pagination_limit || prev.paginationLimit,
                    paginationMode: data.pagination_mode || prev.paginationMode,
                    siteName: data.site_name || prev.siteName,
                    siteLogo: data.site_logo || prev.siteLogo,
                    siteFavicon: data.site_favicon || prev.siteFavicon,
                    defaultTheme: data.default_theme || prev.defaultTheme,
                    imageNotFound: data.image_not_found || prev.imageNotFound,
                    emptyTableImage: data.empty_table_image || prev.emptyTableImage
                }));
                applyTheme(data);
            }

            return { success: true, data };
        } catch (error) {
            console.error(`Error updating settings for ${type}`, error);
            return { success: false, error };
        }
    };

    return (
        <SettingsContext.Provider value={{
            settingTypes,
            ...globalSettings,
            getSettingsByType,
            updateSettingsByType,
            refreshTypes: initializeSettings,
            loading
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
