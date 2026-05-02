import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Setting from './models/Setting.js';

const fillMissingEmailSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const settings = await Setting.findOne({ type: 'email_settings' });
        
        if (settings) {
            settings.mail_host = 'smtp.gmail.com';
            settings.mail_port = '587';
            settings.mail_username = settings.mail_from_address;
            settings.mail_from_name = 'Vinted Market';
            
            await settings.save();
            console.log('✅ Successfully updated Email Settings in the database!');
        } else {
            console.log('❌ No email_settings found.');
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ Update failed:', error.message);
        process.exit(1);
    }
};

fillMissingEmailSettings();
