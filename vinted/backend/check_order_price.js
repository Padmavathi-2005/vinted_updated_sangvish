import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";

mongoose.connect(MONGO_URI).then(async () => {
    const Item = mongoose.connection.collection('items');
    const Order = mongoose.connection.collection('orders');
    
    const handbag = await Item.findOne({ title: { $regex: /handbag/i } });
    if (!handbag) {
        console.log('Handbag not found');
        process.exit(0);
    }
    
    console.log('Handbag price:', handbag.price);
    
    const orders = await Order.find({ item_id: handbag._id }).toArray();
    console.log('Orders for handbag:');
    orders.forEach(o => {
        console.log(`Order ${o.order_number}:`);
        console.log(`  item_price: ${o.item_price}`);
        console.log(`  shipping_fee: ${o.shipping_fee}`);
        console.log(`  platform_fee: ${o.platform_fee}`);
        console.log(`  total_amount: ${o.total_amount}`);
        console.log(`  refund_amount: ${o.refund_amount}`);
    });
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
