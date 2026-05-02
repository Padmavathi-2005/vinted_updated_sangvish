import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';

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
        localStorage.setItem('user_currency', currency.code);
    };

    const formatPrice = useCallback((priceAmount, itemCurrency = null, targetOverride = null) => {
        if (!priceAmount) return '0.00';

        let targetCurrency = targetOverride || currentCurrency || defaultCurrency;
        if (!targetCurrency) return `€${Number(priceAmount).toFixed(2)}`;

        let rate = targetCurrency.exchange_rate || 1;

        // Determine the base rate from the item's currency, falling back to defaultCurrency
        let baseRate = defaultCurrency ? (defaultCurrency.exchange_rate || 1) : 1;

        if (itemCurrency) {
            const itemCurrencyId = typeof itemCurrency === 'object' ? itemCurrency._id : itemCurrency;
            const found = currencies.find(c =>
                c._id === itemCurrencyId ||
                c.code?.toLowerCase() === (itemCurrencyId || '').toString().toLowerCase()
            );
            if (found) {
                baseRate = found.exchange_rate || 1;
            } else if (typeof itemCurrency === 'object' && itemCurrency.exchange_rate) {
                baseRate = itemCurrency.exchange_rate;
            }
        }

        let converted = (Number(priceAmount) / baseRate) * rate;

        let formatted = converted.toFixed(targetCurrency.decimal_places || 2);

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
    }, [currentCurrency, defaultCurrency, currencies]);

    return (
        <CurrencyContext.Provider value={{
            currencies,
            currentCurrency,
            setCurrency,
            formatPrice,
            defaultCurrency
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export default CurrencyContext;
