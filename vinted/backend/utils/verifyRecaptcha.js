import Setting from '../models/Setting.js';

/**
 * Verifies a Google reCAPTCHA v3 token.
 * 
 * @param {string} token - The g-recaptcha-response token from the frontend.
 * @returns {Promise<{success: boolean, score: number}>} - The verification result.
 */
const verifyRecaptcha = async (token) => {
    try {
        // Fetch reCAPTCHA settings from DB
        const config = await Setting.findOne({ type: 'recaptcha_settings' });

        const secretKey = process.env.RECAPTCHA_SECRET_KEY || config?.recaptcha_secret_key;
        const isEnabled = process.env.RECAPTCHA_ENABLED === 'true' || config?.recaptcha_enabled;

        if (!isEnabled) {
            console.log('[reCAPTCHA] Verification bypassed (disabled)');
            return { success: true, score: 1.0 };
        }

        if (!secretKey) {
            console.warn('[reCAPTCHA] WARNING: Secret key missing despite being enabled');
            return { success: true, score: 1.0 }; // Fail safe if not properly configured
        }

        if (!token) {
            console.error('[reCAPTCHA] ERROR: Token is missing from request');
            return { success: false, message: 'reCAPTCHA token missing.' };
        }

        const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const params = new URLSearchParams();
        params.append('secret', secretKey);
        params.append('response', token);

        console.log(`[reCAPTCHA] Verifying token with Google...`);
        const response = await fetch(verificationUrl, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = await response.json();
        console.log(`[reCAPTCHA] Google response:`, JSON.stringify(data));

        const { success, score, 'error-codes': errors } = data;

        if (!success) {
            console.error('[reCAPTCHA] Google verification REJECTED:', errors);
            return {
                success: false,
                message: `reCAPTCHA verification failed: ${errors ? errors.join(', ') : 'unknown error'}`,
                errors
            };
        }

        console.log(`[reCAPTCHA] Verified successfully. Score: ${score}`);
        return { success: true, score };
    } catch (error) {
        console.error('[reCAPTCHA] CRITICAL ERROR during verification:', error.message);
        return { success: false, error: 'Internal server error during reCAPTCHA verification.' };
    }
};

export default verifyRecaptcha;
