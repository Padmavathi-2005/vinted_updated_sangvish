
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Item from './models/Item.js';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const checkItems = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const items = await Item.find({ status: 'active' }).limit(5);
        
        console.log(`Found ${items.length} active items.`);
        for (const item of items) {
            console.log(`\nItem: ${item.title}`);
            console.log(`Images:`, JSON.stringify(item.images, null, 2));
            if (item.images && item.images.length > 0) {
                item.images.forEach((img, i) => {
                    console.log(`  Image ${i}: type=${typeof img}, isArray=${Array.isArray(img)}, value=${JSON.stringify(img)}`);
                });
            }
            const seller = await User.findById(item.seller_id);
            console.log(`Seller Found: ${!!seller}`);
            if (seller) console.log(`Seller Username: ${seller.username}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkItems();
