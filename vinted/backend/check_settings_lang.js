
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Setting from './models/Setting.js';
import Language from './models/Language.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const checkSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const allSettings = await Setting.find({});
        const langs = await Language.find({});
        const langCodes = langs.map(l => l.code);
        
        console.log('--- Languages Table ---');
        langs.forEach(l => console.log(`${l.code}: ${l._id}`));

        console.log(`\nFound ${allSettings.length} settings documents.`);

        allSettings.forEach((settings, sIdx) => {
            console.log(`\n--- Setting Document ${sIdx + 1} ---`);
            console.log(`ID: ${settings._id}`);
            console.log(`Type: ${settings.type}`);
            console.log(`default_language_id: ${settings.default_language_id}`);
            
            const multiFields = ['site_name', 'site_description', 'site_keywords', 'cookie_heading', 'cookie_message', 'cookie_button_text', 'footer_tagline', 'footer_copyright'];
            
            multiFields.forEach(field => {
                const value = settings[field] || {};
                const keys = Object.keys(value);
                const missing = langCodes.filter(c => !keys.includes(c));
                const extra = keys.filter(c => !langCodes.includes(c));

                console.log(`\nField: ${field}`);
                console.log(`  Keys: ${keys.join(', ')}`);
                if (missing.length > 0) console.log(`  ⚠️ Missing: ${missing.join(', ')}`);
                if (extra.length > 0) console.log(`  🚩 Extra: ${extra.join(', ')}`);
            });
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkSettings();
