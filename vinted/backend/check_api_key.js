import Setting from './models/Setting.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const checkSettings = async () => {
    await connectDB();
    const apiSettings = await Setting.findOne({ type: 'api_settings' });
    console.log("DB API Key exists:", !!apiSettings?.gemini_api_key);
    if (apiSettings?.gemini_api_key) {
        console.log("DB Key starts with:", apiSettings.gemini_api_key.substring(0, 5));
    }
    process.exit();
};

checkSettings();
