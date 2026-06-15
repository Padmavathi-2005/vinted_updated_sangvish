const mongoose = require('mongoose');
const Order = require('./models/Order');

async function checkOrders() {
    await mongoose.connect('mongodb://localhost:27017/vinted_updated_sangvish');
    const orders = await Order.find({ 
        order_status: { $in: ['delivered', 'returned'] }
    }).select('order_number packed_at shipped_at out_for_delivery_at delivered_at return_requested_at').limit(5);
    
    console.log(orders);
    mongoose.disconnect();
}
checkOrders();
