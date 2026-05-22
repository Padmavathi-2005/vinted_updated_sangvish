
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Setting from './models/Setting.js';
import Language from './models/Language.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const fixSettings = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.\n');

        const langs = await Language.find({});
        const langCodes = langs.map(l => l.code);
        console.log(`🌐 Active languages: ${langCodes.join(', ')}`);

        const allSettings = await Setting.find({});
        console.log(`📑 Found ${allSettings.length} settings documents.`);

        const multiFields = [
            'site_name', 
            'site_description', 
            'site_keywords', 
            'cookie_heading', 
            'cookie_message', 
            'cookie_button_text', 
            'footer_tagline', 
            'footer_copyright'
        ];

        for (const settings of allSettings) {
            let updated = false;
            console.log(`\nChecking settings: ${settings.type} (${settings._id})`);

            for (const field of multiFields) {
                // Ensure field is an object
                if (!settings[field] || typeof settings[field] !== 'object') {
                    settings[field] = {};
                }

                const currentValue = settings[field];
                const existingKeys = Object.keys(currentValue);
                
                // Find a fallback value (prefer 'en')
                const fallbackValue = currentValue['en'] || (existingKeys.length > 0 ? currentValue[existingKeys[0]] : '');

                langCodes.forEach(code => {
                    if (!currentValue[code]) {
                        console.log(`  ➕ Adding [${code}] to [${field}] using fallback: "${fallbackValue}"`);
                        currentValue[code] = fallbackValue;
                        updated = true;
                    }
                });
                
                if (updated) {
                    settings.markModified(field);
                }
            }

            if (updated) {
                await settings.save();
                console.log(`✅ Saved changes for ${settings.type}`);
            } else {
                console.log(`⏭️ No changes needed for ${settings.type}`);
            }
        }

        console.log('\n✨ All settings synchronized with active languages.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

fixSettings();
