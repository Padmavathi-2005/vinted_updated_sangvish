import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';

const syncAll = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const categories = await Category.find({}, 'name image icon');
        console.log(`Processing ${categories.length} categories...`);

        for (const cat of categories) {
            // Find subcategories named "All [CategoryName]" or just "All" under this category
            // Case-insensitive match for names starting with "All"
            const query = {
                category_id: cat._id,
                name: { $regex: /^All/i }
            };

            const result = await Subcategory.updateMany(
                query,
                { $set: { image: cat.image, icon: cat.icon } }
            );

            if (result.modifiedCount > 0) {
                console.log(`Updated subcategory icons for: ${cat.name} (${result.modifiedCount} updated)`);
            }
        }

        console.log('✅ Subcategory icon sync complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing icons:', error);
        process.exit(1);
    }
};

syncAll();
