import { useState, useEffect } from 'react';

/**
 * Hook to handle Google reCAPTCHA v3 script loading and execution.
 * 
 * @param {string} siteKey - The Google reCAPTCHA v3 site key.
 * @param {boolean} enabled - Whether reCAPTCHA is enabled.
 * @returns {Function} - executeRecaptcha function.
 */
const useRecaptcha = (siteKey, enabled) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled || !siteKey) return;

        // Check if script already exists
        const scriptId = 'google-recaptcha-v3';
        const existingScript = document.getElementById(scriptId);

        if (existingScript) {
            // If key changed, we MUST remove and reload for the new key to take effect in execution
            if (existingScript.src.includes(siteKey)) {
                setIsLoaded(true);
                return;
            } else {
                console.log('[reCAPTCHA] Site key changed, reloading script...');
                existingScript.remove();
                // We might also need to remove global grecaptcha objects if we wanted a truly clean state,
                // but usually browsers handle the script re-execution well enough for token generation.
                const badge = document.querySelector('.grecaptcha-badge');
                if (badge) badge.remove();
            }
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        script.async = true;
        script.onload = () => {
            console.log('[reCAPTCHA] Script loaded successfully');
            setIsLoaded(true);
        };
        script.onerror = () => {
            console.error('Failed to load reCAPTCHA script');
            setError('reCAPTCHA script failed to load. Please check your internet connection or site key.');
        };
        document.body.appendChild(script);

        return () => {
            // Cleanup on key change
        };
    }, [siteKey, enabled]);

    /**
     * Executes reCAPTCHA and returns a token.
     * 
     * @param {string} action - The action name.
     * @returns {Promise<string|null>} - The token or null if failed/disabled.
     */
    const executeRecaptcha = (action = 'login') => {
        return new Promise((resolve) => {
            if (!enabled || !siteKey) {
                resolve(null);
                return;
            }

            if (error) {
                console.error(error);
                resolve(null);
                return;
            }

            if (!window.grecaptcha) {
                console.error('reCAPTCHA script not loaded yet');
                resolve(null);
                return;
            }

            window.grecaptcha.ready(() => {
                try {
                    window.grecaptcha.execute(siteKey, { action })
                        .then((token) => resolve(token))
                        .catch((err) => {
                            console.error('reCAPTCHA execution error:', err);
                            resolve(null);
                        });
                } catch (err) {
                    console.error('reCAPTCHA Runtime Error:', err.message);
                    if (err.message.includes('Invalid site key')) {
                        console.error('CRITICAL: The site key provided is likely for reCAPTCHA v2 (checkbox) instead of v3 (invisible). Please check your Google Admin Console settings.');
                    }
                    resolve(null);
                }
            });
        });
    };

    return { executeRecaptcha, isLoaded, error };
};

export default useRecaptcha;
