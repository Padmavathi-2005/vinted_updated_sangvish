import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Subcategory from '../models/Subcategory.js';

const updateIcons = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const mappings = [
            { name: 'Clothing', image: '/images/icons/subcategories/clothing.png', icon: '👗' },
            { name: 'Shoes', image: '/images/icons/subcategories/shoes.png', icon: '👠' },
            { name: 'Bags', image: '/images/icons/subcategories/bags.png', icon: '👜' },
            { name: 'Accessories', image: '/images/icons/subcategories/accessories.png', icon: '💍' },
            { name: 'Beauty', image: '/images/icons/subcategories/beauty.png', icon: '💄' },
            { name: 'Grooming', image: '/images/icons/subcategories/beauty.png', icon: '🪒' },
            { name: 'Toys', image: '/images/icons/subcategories/toys.png', icon: '🧸' },
            { name: 'Furniture', image: '/images/icons/subcategories/furniture.png', icon: '🛋️' },
            { name: 'Home Décor', image: '/images/icons/subcategories/furniture.png', icon: '🖼️' },
            { name: 'Kitchen & Dining', image: '/images/icons/subcategories/furniture.png', icon: '🍽️' },
            { name: 'Video Games & Consoles', image: '/images/icons/subcategories/electronics.png', icon: '🎮' },
            { name: 'Computers & Accessories', image: '/images/icons/subcategories/electronics.png', icon: '🖥️' },
            { name: 'Cell Phones & Communication', image: '/images/icons/subcategories/electronics.png', icon: '📱' },
            { name: 'Cycling', image: '/images/icons/subcategories/sports.png', icon: '🚴' },
            { name: 'Outdoor Sports', image: '/images/icons/subcategories/sports.png', icon: '🏕️' },
            { name: 'Designer Women', image: '/images/icons/subcategories/designer.png', icon: '💎' },
            { name: 'Designer Men', image: '/images/icons/subcategories/designer.png', icon: '✨' },
        ];

        for (const map of mappings) {
            const result = await Subcategory.updateMany(
                { name: { $regex: new RegExp(`^${map.name}$`, 'i') } },
                { $set: { icon: map.icon, image: map.image } }
            );
            console.log(`Updated ${map.name}: ${result.modifiedCount} documents`);
        }

        console.log('✅ Database update complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating database:', error);
        process.exit(1);
    }
};

updateIcons();
