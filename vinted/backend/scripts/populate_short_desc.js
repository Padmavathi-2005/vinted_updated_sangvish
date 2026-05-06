import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Item from '../models/Item.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const populateShortDesc = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected.');

        const items = await Item.find({});
        console.log(`Found ${items.length} items to update.`);

        let updatedCount = 0;
        for (const item of items) {
            if (item.description) {
                // Generate short description: first 120 chars, ending at word if possible
                let short = item.description;
                if (short.length > 120) {
                    short = short.substring(0, 117);
                    // Try to find last space to not cut mid-word
                    const lastSpace = short.lastIndexOf(' ');
                    if (lastSpace > 80) {
                        short = short.substring(0, lastSpace);
                    }
                    short += '...';
                }
                
                item.short_description = short;
                await item.save();
                updatedCount++;
                if (updatedCount % 10 === 0) console.log(`Updated ${updatedCount} items...`);
            }
        }

        console.log(`Successfully updated ${updatedCount} items with short descriptions.`);
        process.exit(0);
    } catch (error) {
        console.error('Error populating short descriptions:', error);
        process.exit(1);
    }
};

populateShortDesc();
