import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import colors from 'colors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Item from '../models/Item.js';
import Order from '../models/Order.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Favorite from '../models/Favorite.js';
import ItemView from '../models/ItemView.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanupItemsWithMissingImages = async () => {
    try {
        await connectDB();
        console.log('Connected to database...'.cyan);

        const items = await Item.find({});
        console.log(`Scanning ${items.length} items for missing images...`.yellow);

        const pathsToCheck = [
            path.join(__dirname, '..', 'images', 'items'),
            path.join(__dirname, '..', 'public', 'images', 'items'),
            path.join(__dirname, '..', '..', '..', 'vinted', 'backend', 'images', 'items')
        ];

        console.log('Paths being checked:');
        pathsToCheck.forEach(p => console.log(` - ${p}`));

        const itemsToDelete = [];

        for (const item of items) {
            let hasValidImage = false;

            if (item.images && item.images.length > 0) {
                for (const imgPath of item.images) {
                    if (!imgPath) continue;
                    
                    // Get filename from path (e.g. "images/items/abc.jpg" -> "abc.jpg")
                    const filename = imgPath.split('/').pop();
                    
                    for (const baseDir of pathsToCheck) {
                        const fullPath = path.join(baseDir, filename);
                        if (fs.existsSync(fullPath)) {
                            hasValidImage = true;
                            break;
                        }
                    }
                    if (hasValidImage) break;
                }
            }

            if (!hasValidImage) {
                itemsToDelete.push(item);
            }
        }

        console.log(`Found ${itemsToDelete.length} items with NO physical images on disk.`.red.bold);

        if (itemsToDelete.length === 0) {
            console.log('No cleanup needed.'.green);
            process.exit(0);
        }

        const itemIds = itemsToDelete.map(item => item._id);

        // Kashering the logs - show some titles
        console.log('Example items to be removed:');
        itemsToDelete.slice(0, 5).forEach(item => console.log(` - ${item.title} (${item._id})`));

        // Cascading Cleanup
        console.log('Starting cascading cleanup...'.magenta);

        const orders = await Order.find({
            $or: [
                { item_id: { $in: itemIds } },
                { 'items.item_id': { $in: itemIds } }
            ]
        });
        const orderIds = orders.map(o => o._id);
        
        if (orderIds.length > 0) {
            console.log(`- Removing ${orderIds.length} related orders.`.red);
            await Transaction.deleteMany({ order_id: { $in: orderIds } });
            await Review.deleteMany({ order_id: { $in: orderIds } });
            await Order.deleteMany({ _id: { $in: orderIds } });
        }

        const conversations = await Conversation.find({ item_id: { $in: itemIds } });
        const conversationIds = conversations.map(c => c._id);

        if (conversationIds.length > 0) {
            console.log(`- Removing ${conversationIds.length} related conversations and their messages.`.red);
            await Message.deleteMany({ conversation_id: { $in: conversationIds } });
            await Conversation.deleteMany({ _id: { $in: conversationIds } });
        }

        await Favorite.deleteMany({ item_id: { $in: itemIds } });
        await ItemView.deleteMany({ item_id: { $in: itemIds } });
        await Report.deleteMany({ item_id: { $in: itemIds } });
        await Notification.deleteMany({ 
            $or: [
                { item_id: { $in: itemIds } },
                { order_id: { $in: orderIds } }
            ] 
        });

        const result = await Item.deleteMany({ _id: { $in: itemIds } });
        console.log(`Successfully deleted ${result.deletedCount} items and all their related data.`.green.bold);

        process.exit(0);
    } catch (error) {
        console.error(`Cleanup failed: ${error.message}`.red);
        process.exit(1);
    }
};

cleanupItemsWithMissingImages();
