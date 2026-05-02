import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './config/db.js';
import FrontendContent from './models/FrontendContent.js';

const moveSection = async () => {
    try {
        await connectDB();

        const updates = await FrontendContent.updateMany(
            { section: 'home', key: { $in: ['give_second_life', 'clutter_treasure', 'start_selling', 'sustainability_image_1', 'sustainability_image_2'] } },
            { $set: { section: 'sustainability' } }
        );

        console.log('Update result:', updates);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

moveSection();
