
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Language from './models/Language.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const checkLangs = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.\n');

        const langs = await Language.find({});
        console.log(`📊 Found ${langs.length} languages:`);
        
        langs.forEach((lang, index) => {
            console.log(`\n--- Language ${index + 1} ---`);
            console.log(`ID: ${lang._id}`);
            console.log(`Name: ${lang.name}`);
            console.log(`Code: ${lang.code}`);
            console.log(`Native Name: ${lang.native_name}`);
            console.log(`Direction: ${lang.direction}`);
            console.log(`Active: ${lang.is_active}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

checkLangs();
