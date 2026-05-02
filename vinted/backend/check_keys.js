import mongoose from 'mongoose';
import Setting from './models/Setting.js';
import dotenv from 'dotenv';
dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- Current reCAPTCHA Settings ---');
        const settings = await Setting.findOne({ type: 'recaptcha_settings' });
        if (settings) {
            console.log('ID:', settings._id);
            console.log('Enabled:', settings.recaptcha_enabled);
            console.log('Current SITE KEY:', settings.recaptcha_site_key);
            console.log('Current SECRET KEY:', settings.recaptcha_secret_key);
        } else {
            console.log('No reCAPTCHA settings found in DB!');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
};

check();
