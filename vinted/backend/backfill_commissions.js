require('dotenv').config();
const mongoose = require('mongoose');

const updateOrders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinted');
        console.log('MongoDB connected.');

        // Get the Order model directly if we don't have it
        const orderSchema = new mongoose.Schema({
            item_price: Number,
            platform_fee: Number
        }, { strict: false });

        const OrderModel = mongoose.model('Order', orderSchema, 'orders');

        const orders = await OrderModel.find({ $or: [{ platform_fee: 0 }, { platform_fee: { $exists: false } }] });

        console.log(`Found ${orders.length} orders with missing platform_fee.`);

        let count = 0;
        for (const order of orders) {
            if (order.item_price) {
                order.platform_fee = order.item_price * 0.02; // 2% 
                await order.save();
                count++;
            }
        }

        console.log(`Updated ${count} orders successfully.`);
        process.exit(0);
    } catch (e) {
        console.error('Error updating orders:', e);
        process.exit(1);
    }
};

updateOrders();
