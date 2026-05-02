import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FrontendContent from '../models/FrontendContent.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesPath = path.join(__dirname, '../../frontend/src/locales');

const seedContent = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const languages = fs.readdirSync(localesPath).filter(f => fs.lstatSync(path.join(localesPath, f)).isDirectory());

        // We want to seed home.hero items specifically
        const heroFields = ['hero_title', 'hero_subtitle', 'start_selling', 'explore_items'];

        const contentMap = {}; // { "home.hero_title": { "en": "...", "es": "..." } }

        for (const lang of languages) {
            const filePath = path.join(localesPath, lang, 'translation.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (data.home) {
                    heroFields.forEach(field => {
                        const dbKey = `home.${field}`;
                        if (!contentMap[dbKey]) contentMap[dbKey] = {};
                        contentMap[dbKey][lang] = data.home[field] || '';
                    });
                }
            }
        }

        console.log(`Found ${Object.keys(contentMap).length} keys to seed across ${languages.length} languages.`);

        for (const [fullKey, values] of Object.entries(contentMap)) {
            const [section, key] = fullKey.split('.');
            await FrontendContent.findOneAndUpdate(
                { section, key },
                { section, key, values },
                { upsert: true, new: true }
            );
            console.log(`Seeded: ${section}.${key}`);
        }

        console.log('Seeding complete!');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error.message);
        process.exit(1);
    }
};

seedContent();
