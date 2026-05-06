import asyncHandler from 'express-async-handler';
import Setting from '../models/Setting.js';

// @desc    Get all unique setting types
// @route   GET /api/settings/types
// @access  Private (Admin)
const getSettingTypes = asyncHandler(async (req, res) => {
    const types = await Setting.distinct('type');
    const merged = [...new Set(['general_settings', 'footer_settings', 'cookie_settings', 'payment_settings', 'email_settings', 'api_settings', 'map_settings', 'recaptcha_settings', 'shipping_settings', ...types.filter(t => t !== 'site_settings' && t !== 'social_settings')])];
    res.json(merged);
});

// @desc    Get settings by type
// @route   GET /api/settings/:type
// @access  Public (some might be private)
const getSettingsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    let setting = await Setting.findOne({ type });

    if (!setting && type === 'general_settings') {
        setting = await Setting.create({
            type: 'general_settings',
            site_name: { en: 'My Marketplace' },
            site_url: '',
            site_logo: 'images/site/logo.png',
            site_favicon: 'images/site/favicon.png',
            primary_color: '#0ea5e9',
            secondary_color: '#1e293b',
            pagination_limit: 12,
            pagination_mode: 'paginate',
            maintenance_mode: false,
            timezone: 'UTC',
            admin_commission: 2,
            body_font_name: 'Inter',
            body_font_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        });
    }


    if (!setting && type === 'cookie_settings') {
        setting = await Setting.create({
            type: 'cookie_settings',
            cookie_heading: { en: 'Better experience with cookies' },
            cookie_message: { en: 'Our website uses cookies to improve your experience and show you relevant content. To continue, please accept our use of cookies.' },
            cookie_button_text: { en: 'Accept All' }
        });
    }

    if (!setting && type === 'payment_settings') {
        setting = await Setting.create({
            type: 'payment_settings',
            stripe_enabled: false,
            stripe_test_mode: true,
            stripe_logo: '',
            stripe_translations: {
                en: { name: 'Stripe API', description: 'Accept Credit/Debit cards via Stripe.' }
            },
            stripe_test_public_key: '',
            stripe_test_secret_key: '',
            stripe_test_webhook_secret: '',
            stripe_live_public_key: '',
            stripe_live_secret_key: '',
            stripe_live_webhook_secret: '',
            paypal_enabled: false,
            paypal_test_mode: true,
            paypal_logo: '',
            paypal_translations: {
                en: { name: 'PayPal API', description: 'Accept payments via PayPal Express.' }
            },
            paypal_test_client_id: 'test_paypal_client_id',
            paypal_test_client_secret: 'test_paypal_secret',
            paypal_live_client_id: '',
            paypal_live_client_secret: ''
        });
    }

    if (!setting && type === 'social_login_settings') {
        setting = await Setting.create({
            type: 'social_login_settings',
            google_enabled: false,
            google_client_id: '',
            google_client_secret: '',
            facebook_enabled: false,
            facebook_client_id: '',
            facebook_client_secret: '',
            twitter_enabled: false,
            twitter_client_id: '',
            twitter_client_secret: '',
            apple_enabled: false,
            apple_client_id: '',
            apple_team_id: '',
            apple_key_id: '',
            apple_private_key: '',
            apple_client_secret: '',
        });
    }

    if (!setting && type === 'social_settings') {
        setting = await Setting.create({
            type: 'social_settings',
            social_links: [
                { platform: 'Facebook', icon: 'FaFacebookF', url: 'https://facebook.com' },
                { platform: 'X (Twitter)', icon: 'FaXTwitter', url: 'https://twitter.com' },
                { platform: 'Instagram', icon: 'FaInstagram', url: 'https://instagram.com' }
            ]
        });
    }

    if (!setting && type === 'footer_settings') {
        setting = await Setting.create({
            type: 'footer_settings',
            footer_tagline: { en: 'Your trusted destination for pre-loved fashion. Buy, sell, and discover unique pieces while promoting sustainable style.' },
            footer_copyright: { en: '© 2024 Vinted Clone. All rights reserved.' },
            social_links: [
                { platform: 'Facebook', icon: 'FaFacebookF', url: 'https://facebook.com' },
                { platform: 'X (Twitter)', icon: 'FaXTwitter', url: 'https://twitter.com' },
                { platform: 'Instagram', icon: 'FaInstagram', url: 'https://instagram.com' },
                { platform: 'LinkedIn', icon: 'FaLinkedinIn', url: 'https://linkedin.com' }
            ]
        });
    }

    if (!setting && type === 'api_settings') {
        setting = await Setting.create({
            type: 'api_settings',
            gemini_api_key: ''
        });
    }

    if (!setting && type === 'email_settings') {
        setting = await Setting.create({
            type: 'email_settings',
            mail_driver: 'smtp',
            mail_encryption: 'tls'
        });
    }

    if (!setting && type === 'recaptcha_settings') {
        setting = await Setting.create({
            type: 'recaptcha_settings',
            recaptcha_enabled: false,
            recaptcha_site_key: '',
            recaptcha_secret_key: ''
        });
    }

    if (!setting && type === 'map_settings') {
        setting = await Setting.create({
            type: 'map_settings',
            map_provider: 'openstreetmap',
            google_maps_api_key: ''
        });
    }

    if (!setting && type === 'shipping_settings') {
        setting = await Setting.create({
            type: 'shipping_settings',
            shipping_provider: 'manual',
            shiprocket_email: '',
            shiprocket_password: '',
            easypost_api_key: '',
            dhl_api_key: '',
            dhl_api_secret: '',
            dhl_account_number: '',
            flat_shipping_rate: 200
        });
    }

    if (setting) {
        let responseData = setting.toObject();

        // Ensure general_settings has site fields if they were merged
        if (type === 'general_settings') {
            if (!responseData.site_name) responseData.site_name = { en: 'My Marketplace' };
            if (!responseData.site_logo) responseData.site_logo = 'images/site/logo.png';
            if (!responseData.site_favicon) responseData.site_favicon = 'images/site/favicon.png';
            if (responseData.site_url === undefined) responseData.site_url = '';
        }

        // Type-aware normalization for localized fields
        if (type === 'general_settings' || type === 'site_settings') {
            const field = 'site_name';
            if (!responseData[field] || typeof responseData[field] === 'string') {
                responseData[field] = { en: responseData[field] || '' };
            }
        } else if (type === 'cookie_settings') {
            ['cookie_heading', 'cookie_message', 'cookie_button_text'].forEach(field => {
                if (!responseData[field] || typeof responseData[field] === 'string') {
                    responseData[field] = { en: responseData[field] || '' };
                }
            });
            if (responseData.cookie_page_id === undefined) {
                responseData.cookie_page_id = null;
            }
        } else if (type === 'footer_settings') {
            ['footer_tagline', 'footer_copyright'].forEach(field => {
                if (!responseData[field] || typeof responseData[field] === 'string') {
                    responseData[field] = { en: responseData[field] || '' };
                }
            });
        }

        // SECURITY: Never send secret keys to the public frontend
        const sensitiveFields = [
            'recaptcha_secret_key', 
            'google_client_secret', 
            'facebook_client_secret', 
            'twitter_client_secret', 
            'apple_client_secret',
            'apple_private_key',
            'mail_password',
            'stripe_test_secret_key',
            'stripe_live_secret_key',
            'stripe_test_webhook_secret',
            'stripe_live_webhook_secret',
            'paypal_test_client_secret',
            'paypal_live_client_secret',
            'gemini_api_key',
            'huggingface_api_key',
            'shiprocket_password',
            'easypost_api_key',
            'dhl_api_secret'
        ];

        // Only filter for non-admin requests or if we want to be safe
        // (For now, let's just filter them all for simplicity in public GET)
        sensitiveFields.forEach(field => {
            if (responseData[field] !== undefined) {
                delete responseData[field];
            }
        });

        res.json(responseData);
    } else {
        res.status(404).json({ message: 'Settings not found' });
    }
});

// @desc    Update settings by type
// @route   PUT /api/settings/:type
// @access  Private (Admin)
const updateSettingsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    let setting = await Setting.findOne({ type });
    const updateData = { ...req.body };

    console.log(`[Settings] Updating ${type}. Data:`, JSON.stringify(updateData, null, 2));

    const blacklist = ['_id', '__v', 'created_at', 'updated_at', 'type'];
    blacklist.forEach(field => {
        if (updateData[field] !== undefined) {
            updateData[field] = undefined;
        }
    });

    // Handle any files uploaded
    if (req.files) {
        Object.keys(req.files).forEach(fieldName => {
            const file = req.files[fieldName][0];
            updateData[fieldName] = `images/site/${file.filename}`;
        });
    }

    // Attempt to parse JSON strings for translatable fields or mixed objects
    Object.keys(updateData).forEach(key => {
        const val = updateData[key];

        // Convert string "true" / "false" back to booleans
        if (val === 'true') updateData[key] = true;
        if (val === 'false') updateData[key] = false;

        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try {
                updateData[key] = JSON.parse(val);
            } catch (e) {
                // Not valid JSON, keep as string
            }
        }
    });

    // CRITICAL: Ensure social login and recaptcha settings are saved to their specific documents
    // even if the admin UI sends them via a general update route.
    const socialFields = ['google_', 'facebook_', 'twitter_', 'apple_'];
    const recaptchaFields = ['recaptcha_'];
    
    const isSocialUpdate = Object.keys(updateData).some(k => socialFields.some(sf => k.startsWith(sf)));
    const isRecaptchaUpdate = Object.keys(updateData).some(k => recaptchaFields.some(rf => k.startsWith(rf)));

    if (isSocialUpdate && type !== 'social_login_settings') {
        console.log(`[Settings] Redirecting social fields update to social_login_settings type`);
        let socialDoc = await Setting.findOne({ type: 'social_login_settings' });
        if (!socialDoc) socialDoc = new Setting({ type: 'social_login_settings' });
        
        Object.keys(updateData).forEach(key => {
            if (socialFields.some(sf => key.startsWith(sf))) {
                socialDoc.set(key, updateData[key]);
            }
        });
        await socialDoc.save();
        console.log(`[Settings] Social login settings synchronized separately.`);
    }

    if (isRecaptchaUpdate && type !== 'recaptcha_settings') {
        console.log(`[Settings] Redirecting recaptcha fields update to recaptcha_settings type`);
        let recaptchaDoc = await Setting.findOne({ type: 'recaptcha_settings' });
        if (!recaptchaDoc) recaptchaDoc = new Setting({ type: 'recaptcha_settings' });
        
        Object.keys(updateData).forEach(key => {
            if (recaptchaFields.some(rf => key.startsWith(rf))) {
                recaptchaDoc.set(key, updateData[key]);
            }
        });
        await recaptchaDoc.save();
        console.log(`[Settings] Recaptcha settings synchronized separately.`);
    }

    try {
        if (setting) {
            console.log(`[Settings] Found existing setting for ${type}. Updating fields...`);
            Object.keys(updateData).forEach(key => {
                const val = updateData[key];
                // Skip invalid data
                if (val === undefined || val === 'undefined') {
                    console.log(`[Settings] Skipping field ${key} because it is undefined`);
                    return;
                }

                console.log(`[Settings] Setting field ${key} to value:`, val);

                // Force null for empty ObjectId fields to prevent casting errors
                if (key.endsWith('_id')) {
                    if (val === '' || val === null || val === 'null' || val === 'undefined') {
                        console.log(`[Settings] Field ${key} is empty ObjectId, setting to null`);
                        setting.set(key, null);
                    } else {
                        setting.set(key, val);
                    }
                    return;
                }

                // Explicit casting for known numeric fields
                if (['pagination_limit', 'admin_commission', 'flat_shipping_rate'].includes(key)) {
                    const numVal = parseFloat(val);
                    console.log(`[Settings] Field ${key} is numeric. Cast to:`, numVal);
                    setting.set(key, isNaN(numVal) ? null : numVal);
                    return;
                }

                setting.set(key, val);
            });
            console.log(`[Settings] Saving setting document...`);
            const updatedSetting = await setting.save();
            console.log(`[Settings] Successfully saved ${type}`);
            res.json(updatedSetting);
            return;
        } else {
            console.log(`[Settings] No setting found for ${type}. Creating new...`);
            const newSetting = await Setting.create({ ...updateData, type });
            console.log(`[Settings] Successfully created ${type}`);
            res.status(201).json(newSetting);
            return;
        }
    } catch (error) {
        console.error(`[Settings] ERROR updating ${type}:`, error);
        if (!res.headersSent) {
            res.status(500).json({
                message: `Failed to update settings: ${error.message}`
            });
        }
    }
});

// Backward compatibility for main frontend
const getSettings = asyncHandler(async (req, res) => {
    const allSettings = await Setting.find({});
    // Order settings so that more specific/important ones come later in the merge
    const order = ['general_settings', 'site_settings', 'footer_settings', 'cookie_settings', 'social_login_settings', 'social_settings', 'payment_settings'];
    allSettings.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

    let merged = {};
    allSettings.forEach(s => {
        if (s.type === 'api_settings') return;
        const obj = s.toObject();
        
        // Filtering sensitive keys
        Object.keys(obj).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (
                lowerKey.includes('secret') ||
                lowerKey.includes('private') ||
                lowerKey.includes('key_live') ||
                lowerKey.includes('key_test') ||
                lowerKey.includes('password')
            ) {
                if (!lowerKey.includes('public_key') && !lowerKey.includes('client_id')) {
                    delete obj[key];
                }
            }
        });

        // Merge the current doc into the accumulator
        // (More specific settings documents processed later will correctly overwrite earlier ones)
        merged = { ...merged, ...obj };
    });

    // Merge environment overrides
    if (process.env.RECAPTCHA_SITE_KEY) merged.recaptcha_site_key = process.env.RECAPTCHA_SITE_KEY;
    if (process.env.RECAPTCHA_ENABLED) merged.recaptcha_enabled = process.env.RECAPTCHA_ENABLED === 'true';

    res.json(merged);
});

export {
    getSettingTypes,
    getSettingsByType,
    updateSettingsByType,
    getSettings,
};
