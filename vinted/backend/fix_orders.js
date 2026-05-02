const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const res = await Order.updateMany(
            { order_status: { $in: [null, '', 'pending'] } },
            { $set: { order_status: 'placed' } }
        );

        console.log(`Updated ${res.modifiedCount} orders to 'placed' status.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
