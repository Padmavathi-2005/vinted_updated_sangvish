import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import colors from 'colors';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Item from '../models/Item.js';

const inspectItems = async () => {
    try {
        await connectDB();
        const emptyItems = await Item.find({
            $or: [
                { images: { $size: 0 } },
                { images: { $exists: false } },
                { images: null },
                { images: { $elemMatch: { $in: [null, '', ' ', undefined] } } }
            ]
        });
        
        console.log(`Total items found with no/invalid images: ${emptyItems.length}`);
        
        const shortImageItems = await Item.find({
            images: { $elemMatch: { $regex: /^.{0,5}$/ } }
        });
        console.log(`Total items with very short image strings (0-5 chars): ${shortImageItems.length}`);
        shortImageItems.forEach(item => {
            console.log(`ID: ${item._id} | Title: ${item.title} | Images: ${JSON.stringify(item.images)}`);
        });
        
        // Also check if any items have strings like "null" or "undefined"
        const suspiciousItems = await Item.find({
            images: { $in: ["null", "undefined", "[]", "{}"] }
        });
        console.log(`Total items with suspicious image strings: ${suspiciousItems.length}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

inspectItems();
