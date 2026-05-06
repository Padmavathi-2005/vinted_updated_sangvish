import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import colors from 'colors';
import mongoose from 'mongoose';
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

const cleanupItemsWithoutImages = async () => {
    try {
        await connectDB();
        console.log('Connected to database...'.cyan);

        // 1. Find items without images
        // We consider items without images if the array is empty or only contains null/undefined/empty strings
        const items = await Item.find({
            $or: [
                { images: { $size: 0 } },
                { images: { $exists: false } },
                { images: null },
                { images: { $elemMatch: { $in: [null, '', ' ', undefined] } } }
            ]
        });

        console.log(`Found ${items.length} items without images.`.yellow);

        if (items.length === 0) {
            console.log('No cleanup needed.'.green);
            process.exit(0);
        }

        const itemIds = items.map(item => item._id);

        // 2. Cleanup related data
        console.log('Starting cascading cleanup...'.magenta);

        // Cleanup Orders and related Transactions
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

        // Cleanup Conversations and Messages
        const conversations = await Conversation.find({ item_id: { $in: itemIds } });
        const conversationIds = conversations.map(c => c._id);

        if (conversationIds.length > 0) {
            console.log(`- Removing ${conversationIds.length} related conversations and their messages.`.red);
            await Message.deleteMany({ conversation_id: { $in: conversationIds } });
            await Conversation.deleteMany({ _id: { $in: conversationIds } });
        }

        // Cleanup other dependencies
        console.log(`- Removing related favorites, views, reports, and notifications.`.red);
        await Favorite.deleteMany({ item_id: { $in: itemIds } });
        await ItemView.deleteMany({ item_id: { $in: itemIds } });
        await Report.deleteMany({ item_id: { $in: itemIds } }); // Product reports
        await Notification.deleteMany({ 
            $or: [
                { item_id: { $in: itemIds } },
                { order_id: { $in: orderIds } }
            ] 
        });

        // 3. Delete the items themselves
        const result = await Item.deleteMany({ _id: { $in: itemIds } });
        console.log(`Successfully deleted ${result.deletedCount} items and all their related data.`.green.bold);

        process.exit(0);
    } catch (error) {
        console.error(`Cleanup failed: ${error.message}`.red);
        process.exit(1);
    }
};

cleanupItemsWithoutImages();
