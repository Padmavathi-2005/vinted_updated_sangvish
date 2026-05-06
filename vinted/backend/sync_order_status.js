import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Order from './models/Order.js';
import Item from './models/Item.js';

const syncOrderStatus = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        console.log('Syncing Item status with Orders...');

        // 1. Find all orders that are NOT cancelled or returned
        const activeOrders = await Order.find({ 
            order_status: { $nin: ['cancelled', 'returned'] } 
        });

        console.log(`Found ${activeOrders.length} active/completed orders to process.`);

        let updatedCount = 0;
        for (const order of activeOrders) {
            // Support both single items and bundles
            const itemsInOrder = order.is_bundle ? order.items : [{ item_id: order.item_id }];
            
            for (const itm of itemsInOrder) {
                if (!itm.item_id) continue;
                
                const updateData = {
                    is_ordered: true,
                    status: 'sold' // Mark as sold so it doesn't show in standard 'active' queries
                };
                
                // If it reached 'delivered' state, mark as specifically is_sold: true
                if (order.order_status === 'delivered') {
                    updateData.is_sold = true;
                }

                const result = await Item.findByIdAndUpdate(itm.item_id, updateData);
                if (result) {
                    updatedCount++;
                }
            }
        }

        console.log(`✅ Database Synchronization Complete!`);
        console.log(`Updated ${updatedCount} items based on existing order history.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Synchronization failed:', error.message);
        process.exit(1);
    }
};

syncOrderStatus();
