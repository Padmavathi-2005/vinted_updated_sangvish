import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './config/db.js';
import FrontendContent from './models/FrontendContent.js';

const seed = async () => {
    try {
        await connectDB();

        const keys = [
            {
                section: 'home',
                key: 'give_second_life',
                values: { en: 'Give your items a second life.' }
            },
            {
                section: 'home',
                key: 'clutter_treasure',
                values: { en: "Someone's clutter is another person's treasure. Selling your unused items extends their lifecycle and keeps them out of landfills. Join the circular economy today." }
            },
            {
                section: 'home',
                key: 'start_selling',
                values: { en: 'Start Selling Now' }
            },
            {
                section: 'home',
                key: 'sustainability_image_1',
                values: { en: 'https://images.unsplash.com/photo-1556012018-50c5c0da73bf?w=600&q=80' }
            },
            {
                section: 'home',
                key: 'sustainability_image_2',
                values: { en: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&q=80' }
            }
        ];

        for (const item of keys) {
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

seed();
