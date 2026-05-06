import mongoose from 'mongoose';

const settingSchema = mongoose.Schema(
    {
        type: {
            type: String,
            default: 'general_settings',
        },
        site_name: {
            type: mongoose.Schema.Types.Mixed,
        },
        site_url: {
            type: String,
        },
        site_logo: {
            type: String,
        },
        image_not_found: {
            type: String,
        },
        empty_table_image: {
            type: String,
        },
        site_favicon: {
            type: String,
        },
        site_og_image: {
            type: String,
        },
        site_description: {
            type: mongoose.Schema.Types.Mixed,
        },
        site_keywords: {
            type: mongoose.Schema.Types.Mixed,
        },
        primary_color: {
            type: String,
        },
        body_font_name: {
            type: String,
        },
        body_font_url: {
            type: String,
        },
        pagination_limit: {
            type: Number,
        },
        pagination_mode: {
            type: String,
            enum: ['paginate', 'scroll'],
        },
        general_settings: {
            type: Map,
            of: String,
            default: {},
        },
        default_language_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Language',
        },
        default_currency_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Currency',
        },
        maintenance_mode: {
            type: Boolean,
        },
        support_email: {
            type: String,
        },
        timezone: {
            type: String,
        },
        admin_commission: {
            type: Number,
        },
        cookie_heading: {
            type: mongoose.Schema.Types.Mixed,
        },
        cookie_message: {
            type: mongoose.Schema.Types.Mixed,
        },
        cookie_button_text: {
            type: mongoose.Schema.Types.Mixed,
        },
        cookie_page_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Page',
        },
        // Stripe Fields
        stripe_enabled: { type: Boolean, default: false },
        stripe_test_mode: { type: Boolean, default: true },
        stripe_test_public_key: { type: String },
        stripe_test_secret_key: { type: String },
        stripe_test_webhook_secret: { type: String },
        stripe_live_public_key: { type: String },
        stripe_live_secret_key: { type: String },
        stripe_live_webhook_secret: { type: String },
        // PayPal Fields
        paypal_enabled: { type: Boolean, default: false },
        paypal_test_mode: { type: Boolean, default: true },
        paypal_test_client_id: { type: String },
        paypal_test_client_secret: { type: String },
        paypal_live_client_id: { type: String },
        paypal_live_client_secret: { type: String },
        // Gateway logos
        stripe_logo: { type: String },
        paypal_logo: { type: String },
        // Gateway translations (Mixed for localized names/descriptions)
        stripe_translations: { type: mongoose.Schema.Types.Mixed },
        paypal_translations: { type: mongoose.Schema.Types.Mixed },
        // AI Settings
        gemini_api_key: { type: String },
        huggingface_api_key: { type: String },
        support_phone: { type: String },
        support_address: { type: String },
        // Email Settings
        mail_driver: { type: String, default: 'smtp' },
        mail_host: { type: String },
        mail_port: { type: String },
        mail_username: { type: String },
        mail_password: { type: String },
        mail_encryption: { type: String, enum: ['ssl', 'tls', 'none'], default: 'tls' },
        mail_from_address: { type: String },
        mail_from_name: { type: String },
        footer_tagline: { type: mongoose.Schema.Types.Mixed },
        footer_copyright: { type: mongoose.Schema.Types.Mixed },
        social_links: [
            {
                platform: { type: String },
                icon: { type: String }, // Can be SVG path or icon name
                url: { type: String }
            }
        ],
        // reCAPTCHA Fields
        recaptcha_enabled: { type: Boolean, default: false },
        recaptcha_site_key: { type: String },
        recaptcha_secret_key: { type: String },
        // Social Login Fields
        google_enabled: { type: Boolean, default: false },
        google_client_id: { type: String },
        google_client_secret: { type: String },
        facebook_enabled: { type: Boolean, default: false },
        facebook_client_id: { type: String },
        facebook_client_secret: { type: String },
        twitter_enabled: { type: Boolean, default: false },
        twitter_client_id: { type: String },
        twitter_client_secret: { type: String },
        apple_enabled: { type: Boolean, default: false },
        apple_client_id: { type: String }, // Services ID
        apple_team_id: { type: String }, // Team ID
        apple_key_id: { type: String }, // Key ID
        apple_private_key: { type: String }, // Content of .p8 file
        apple_client_secret: { type: String }, // Not used by passport-apple but kept for compatibility
        // Map Settings
        map_provider: { type: String, enum: ['openstreetmap', 'google'], default: 'openstreetmap' },
        google_maps_api_key: { type: String, default: '' },
        // Shipping Settings
        shipping_provider: { type: String, enum: ['manual', 'shiprocket', 'easypost', 'dhl'], default: 'manual' },
        shiprocket_email: { type: String, default: '' },
        shiprocket_password: { type: String, default: '' },
        easypost_api_key: { type: String, default: '' },
        dhl_api_key: { type: String, default: '' },
        dhl_api_secret: { type: String, default: '' },
        dhl_account_number: { type: String, default: '' },
        flat_shipping_rate: { type: Number, default: 200 },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
        toJSON: {
            transform: function (doc, ret) {
                ['site_logo', 'site_favicon', 'site_og_image', 'image_not_found', 'empty_table_image', 'stripe_logo', 'paypal_logo'].forEach(field => {
                    if (ret[field] && !ret[field].startsWith('http')) {
                        let clean = ret[field].replace(/^\/+/, '');
                        clean = clean.replace(/^images\/site\//, '');
                        ret[field] = `images/site/${clean}`;
                    }
                });
                return ret;
            }
        },
        toObject: {
            transform: function (doc, ret) {
                ['site_logo', 'site_favicon', 'site_og_image', 'image_not_found', 'empty_table_image', 'stripe_logo', 'paypal_logo'].forEach(field => {
                    if (ret[field] && !ret[field].startsWith('http')) {
                        let clean = ret[field].replace(/^\/+/, '');
                        clean = clean.replace(/^images\/site\//, '');
                        ret[field] = `images/site/${clean}`;
                    }
                });
                return ret;
            }
        }
    }
);

export default mongoose.model('Setting', settingSchema);
