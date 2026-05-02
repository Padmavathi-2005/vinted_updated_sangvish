import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './config/db.js';
import FrontendContent from './models/FrontendContent.js';

const moveSection = async () => {
    try {
        await connectDB();

        const keysToAdd = [
            {
                section: 'home',
                key: 'stat_rating_value',
                values: { en: '4.8/5' }
            },
            {
                section: 'home',
                key: 'stat_rating_label',
                values: { en: 'User Trust Rating' }
            },
            {
                section: 'home',
                key: 'stat_sellers_value',
                values: { en: '5M+' }
            },
            {
                section: 'home',
                key: 'stat_sellers_label',
                values: { en: 'Happy Sellers' }
            }
        ];

        for (const item of keysToAdd) {
            const existing = await FrontendContent.findOne({ section: item.section, key: item.key });
            if (!existing) {
                await FrontendContent.create(item);
                console.log(`Added ${item.key}`);
            } else {
                console.log(`${item.key} already exists!`);
            }
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

moveSection();
