'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from '@/utils/axios';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const [currencies, setCurrencies] = useState([
        { _id: 'inr', name: 'Indian Rupee', code: 'INR', symbol: '₹', exchange_rate: 1 }
    ]);
    const [currentCurrency, setCurrentCurrency] = useState({ _id: 'inr', name: 'Indian Rupee', code: 'INR', symbol: '₹', exchange_rate: 1 });
    const [defaultCurrency, setDefaultCurrency] = useState(null);

    // Fetch currencies and settings exactly once when app loads
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [settingsRes, currenciesRes] = await Promise.all([
                    axios.get('/api/settings').catch(() => ({ data: null })),
                    axios.get('/api/currencies').catch(() => ({ data: [] }))
                ]);

                let defCurrency = null;
                if (settingsRes.data && settingsRes.data.default_currency_id) {
                    defCurrency = settingsRes.data.default_currency_id;
                    // Dont set state here as it would be just the ID string
                }

                if (Array.isArray(currenciesRes.data)) {
                    setCurrencies(currenciesRes.data);

                    if (defCurrency) {
                        const foundDefault = currenciesRes.data.find(c => c._id === defCurrency);
                        if (foundDefault) setDefaultCurrency(foundDefault);
                    }
                }

                // Check local storage for user's preferred currency
                const storedCurrencyCode = localStorage.getItem('user_currency');

                if (storedCurrencyCode && Array.isArray(currenciesRes.data)) {
                    const found = currenciesRes.data.find(c => c.code === storedCurrencyCode);
                    if (found) {
                        setCurrentCurrency(found);
                    } else if (defCurrency) {
                        const defFound = currenciesRes.data.find(c => c._id === defCurrency);
                        if (defFound) setCurrentCurrency(defFound);
                    }
                } else if (defCurrency && Array.isArray(currenciesRes.data)) {
                    const defFound = currenciesRes.data.find(c => c._id === defCurrency);
                    if (defFound) setCurrentCurrency(defFound);
                } else if (Array.isArray(currenciesRes.data) && currenciesRes.data.length > 0) {
                    setCurrentCurrency(currenciesRes.data[0]);
                }

            } catch (error) {
                console.error("Failed to fetch currency data:", error);
            }
        };

        fetchInitialData();
    }, []);

    const setCurrency = (currency) => {
        setCurrentCurrency(currency);
        if (typeof window !== 'undefined') {
            localStorage.setItem('user_currency', currency.code);
        }
    };

    const convertPrice = useCallback((priceAmount, sourceCurrency = null, targetOverride = null) => {
        if (!priceAmount && priceAmount !== 0) return 0;
        
        const targetCurrency = targetOverride || currentCurrency || defaultCurrency;
        const source = sourceCurrency || defaultCurrency;

        // Optimization: If source and target are the same, no math needed
        const sourceId = typeof source === 'object' ? (source.code || source._id || source.id) : source;
        const targetId = typeof targetCurrency === 'object' ? (targetCurrency.code || targetCurrency._id || targetCurrency.id) : targetCurrency;
        
        if (sourceId && targetId && String(sourceId).toLowerCase() === String(targetId).toLowerCase()) {
            return Number(priceAmount);
        }

        const getRate = (cur) => {
            if (!cur) return 1;
            
            // If it's a number/string, it's an ID or code
            const identifier = typeof cur === 'object' ? (cur.code || cur._id || cur.id) : cur;
            if (!identifier) return cur.exchange_rate || 1;

            // Try to find in our full currencies list for the most up-to-date rate
            const found = currencies.find(c => 
                (c.code && identifier && c.code.toLowerCase() === String(identifier).toLowerCase()) ||
                String(c._id) === String(identifier) || 
                String(c.id) === String(identifier)
            );

            if (found) return found.exchange_rate;
            if (typeof cur === 'object' && cur.exchange_rate) return cur.exchange_rate;
            return 1;
        };

        const targetRate = getRate(targetCurrency);
        const sourceRate = getRate(source);

        return (Number(priceAmount) / sourceRate) * targetRate;
    }, [currentCurrency, defaultCurrency, currencies]);

    const formatPrice = useCallback((priceAmount, itemCurrency = null, targetOverride = null) => {
        if (!priceAmount && priceAmount !== 0) return '';

        let targetCurrency = targetOverride || currentCurrency || defaultCurrency;
        if (!targetCurrency) return `€${Number(priceAmount).toFixed(2)}`;

        // Use the robust convertPrice for the actual math
        const converted = convertPrice(priceAmount, itemCurrency, targetCurrency);

        let formatted = Number(converted).toFixed(targetCurrency.decimal_places || 2);

        if (targetCurrency.thousand_separator) {
            formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, targetCurrency.thousand_separator);
        }

        if (targetCurrency.decimal_separator && targetCurrency.decimal_separator !== '.') {
            formatted = formatted.replace('.', targetCurrency.decimal_separator);
        }

        if (targetCurrency.symbol_position === 'after') {
            return `${formatted}${targetCurrency.symbol || '€'}`;
        }
        return `${targetCurrency.symbol || '€'}${formatted}`;
    }, [currentCurrency, defaultCurrency, convertPrice]);

    return (
        <CurrencyContext.Provider value={{
            currencies,
            currentCurrency,
            setCurrency,
            formatPrice,
            convertPrice,
            defaultCurrency
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export default CurrencyContext;
