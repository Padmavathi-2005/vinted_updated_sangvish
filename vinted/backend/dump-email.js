import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Setting from './models/Setting.js';

const fetchSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const settings = await Setting.findOne({ type: 'email_settings' });
        console.log("DB RECORD:", JSON.stringify(settings, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fetchSettings();
