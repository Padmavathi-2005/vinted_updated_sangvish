import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Item from '../models/Item.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

const populateSlugs = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected.');

        const items = await Item.find({});
        console.log(`Found ${items.length} items to update.`);

        let updatedCount = 0;
        for (const item of items) {
            if (item.title) {
                const slug = `${slugify(item.title)}-${item._id.toString().substring(18)}`;
                item.slug = slug;
                await item.save();
                updatedCount++;
                if (updatedCount % 10 === 0) console.log(`Updated ${updatedCount} items...`);
            }
        }

        console.log(`Successfully updated ${updatedCount} items with SEO slugs.`);
        process.exit(0);
    } catch (error) {
        console.error('Error populating slugs:', error);
        process.exit(1);
    }
};

populateSlugs();
