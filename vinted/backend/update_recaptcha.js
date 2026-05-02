
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Setting from './models/Setting.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.LOCAL_MONGO_URI;

const updateRecaptcha = async () => {
    try {
        console.log('Connecting to MongoDB:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        
        const siteKey = '6LelfposAAAAAI9zwnSII4C3es12WXL6toDQI7uH';
        const secretKey = '6LelfposAAAAACwrMlp9g02fVziJpFavdHbHQvEK';

        let settings = await Setting.findOne({ type: 'recaptcha_settings' });
        
        if (settings) {
            settings.recaptcha_site_key = siteKey;
            settings.recaptcha_secret_key = secretKey;
            settings.recaptcha_enabled = true;
            await settings.save();
            console.log('✅ Updated existing recaptcha_settings');
        } else {
            await Setting.create({
                type: 'recaptcha_settings',
                recaptcha_site_key: siteKey,
                recaptcha_secret_key: secretKey,
                recaptcha_enabled: true
            });
            console.log('✅ Created new recaptcha_settings');
        }

        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating settings:', error.message);
        process.exit(1);
    }
};

updateRecaptcha();
