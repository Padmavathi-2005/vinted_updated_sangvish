import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const userId = '6996e50e35a68d34843dfb6e';
        const userObjId = new mongoose.Types.ObjectId(userId);

        const mongooseOrders = await Order.find({ buyer_id: userObjId });
        console.log(`Mongoose Order.find count: ${mongooseOrders.length}`);

        const mongooseStringOrders = await Order.find({ buyer_id: userId });
        console.log(`Mongoose Order.find (string) count: ${mongooseStringOrders.length}`);

        mongoose.disconnect();
    })
    .catch(err => console.error(err));
