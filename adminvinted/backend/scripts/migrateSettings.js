const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

const migrateSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        let oldSettings = await Setting.findOne({ type: 'admin_settings' });
        if (!oldSettings) {
            oldSettings = await Setting.findOne(); // grab first if type changed
        }

        if (oldSettings) {
            console.log('Found existing settings. Splitting into general_settings and site_settings...');

            // Create general_settings
            await Setting.findOneAndUpdate(
                { type: 'general_settings' },
                {
                    $set: {
                        type: 'general_settings',
                        primary_color: oldSettings.primary_color,
                        secondary_color: oldSettings.secondary_color,
                        pagination_limit: oldSettings.pagination_limit,
                        pagination_mode: oldSettings.pagination_mode,
                        default_language_id: oldSettings.default_language_id,
                        default_currency_id: oldSettings.default_currency_id,
                        maintenance_mode: oldSettings.maintenance_mode,
                        allow_registration: oldSettings.allow_registration,
                        allow_guest_checkout: oldSettings.allow_guest_checkout,
                        support_email: oldSettings.support_email,
                        timezone: oldSettings.timezone,
                        admin_commission: oldSettings.admin_commission
                    }
                },
                { upsert: true, new: true }
            );

            // Create site_settings
            await Setting.findOneAndUpdate(
                { type: 'site_settings' },
                {
                    $set: {
                        type: 'site_settings',
                        site_name: oldSettings.site_name,
                        site_logo: oldSettings.site_logo,
                        site_favicon: oldSettings.site_favicon,
                        image_not_found: oldSettings.image_not_found
                    }
                },
                { upsert: true, new: true }
            );

            // Delete old admin_settings
            await Setting.deleteMany({ type: 'admin_settings' });
            console.log('Migrated admin_settings to general_settings and site_settings');
        } else {
            console.log('No admin_settings found to migrate.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

migrateSettings();
