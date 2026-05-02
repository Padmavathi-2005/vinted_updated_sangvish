const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const connectDB = require('./config/db');
const Language = require('./models/Language');

dotenv.config();

const languages = [
    { name: 'English', code: 'en', native_name: 'English', direction: 'ltr', is_active: true },
    { name: 'French', code: 'fr', native_name: 'Français', direction: 'ltr', is_active: true },
    { name: 'Spanish', code: 'es', native_name: 'Español', direction: 'ltr', is_active: true },
    { name: 'German', code: 'de', native_name: 'Deutsch', direction: 'ltr', is_active: true },
    { name: 'Italian', code: 'it', native_name: 'Italiano', direction: 'ltr', is_active: true },
    { name: 'Portuguese', code: 'pt', native_name: 'Português', direction: 'ltr', is_active: true },
    { name: 'Russian', code: 'ru', native_name: 'Русский', direction: 'ltr', is_active: true },
    { name: 'Chinese', code: 'zh', native_name: '中文', direction: 'ltr', is_active: true },
    { name: 'Japanese', code: 'ja', native_name: '日本語', direction: 'ltr', is_active: true },
    { name: 'Korean', code: 'ko', native_name: '한국어', direction: 'ltr', is_active: true },
    { name: 'Arabic', code: 'ar', native_name: 'العربية', direction: 'rtl', is_active: true },
    { name: 'Hindi', code: 'hi', native_name: 'हिन्दी', direction: 'ltr', is_active: true },
    { name: 'Bengali', code: 'bn', native_name: 'বাংলা', direction: 'ltr', is_active: true },
    { name: 'Urdu', code: 'ur', native_name: 'اردو', direction: 'rtl', is_active: true },
    { name: 'Turkish', code: 'tr', native_name: 'Türkçe', direction: 'ltr', is_active: true },
    { name: 'Dutch', code: 'nl', native_name: 'Nederlands', direction: 'ltr', is_active: true },
    { name: 'Swedish', code: 'sv', native_name: 'Svenska', direction: 'ltr', is_active: true },
    { name: 'Polish', code: 'pl', native_name: 'Polski', direction: 'ltr', is_active: true },
    { name: 'Indonesian', code: 'id', native_name: 'Bahasa Indonesia', direction: 'ltr', is_active: true },
    { name: 'Vietnamese', code: 'vi', native_name: 'Tiếng Việt', direction: 'ltr', is_active: true },
    { name: 'Tamil', code: 'ta', native_name: 'தமிழ்', direction: 'ltr', is_active: true }
];

const seedLanguages = async () => {
    try {
        await connectDB();

        const existing = await Language.find();
        if (existing.length === 0) {
            console.log('No languages found, seeding...'.yellow);
            await Language.insertMany(languages);
        } else {
            console.log('Languages already exist. Merging new languages...'.blue);
            for (let lang of languages) {
                await Language.findOneAndUpdate(
                    { code: lang.code },
                    { $set: lang },
                    { upsert: true, new: true }
                );
            }
        }

        console.log('Languages Seeded Successfully!'.green.inverse);
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`.red.inverse);
        process.exit(1);
    }
};

seedLanguages();
