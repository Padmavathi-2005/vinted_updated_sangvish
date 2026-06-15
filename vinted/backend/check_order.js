import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const order = await Order.findOne({ order_number: 'ORD-1781502786352-401' });
        console.log("Order Status:", order.order_status);
        console.log("Created At:", order.created_at);
        console.log("Confirmed At:", order.confirmed_at);
        console.log("Packed At:", order.packed_at);
        console.log("Shipped At:", order.shipped_at);
        console.log("Delivered At:", order.delivered_at);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
