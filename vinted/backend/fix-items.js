import('mongoose').then(async (mongoose) => {
    await mongoose.connect('mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted');
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }));
    
    // Find all orders that are partially refunded
    const orders = await Order.find({ payment_status: 'partially_refunded' });
    let count = 0;
    for (const order of orders) {
        if (order.item_id) {
            await Item.updateOne({ _id: order.item_id }, { $set: { is_ordered: false, is_sold: true, status: 'sold' } });
            count++;
        }
    }
    console.log('Updated', count, 'items to SOLD');
    process.exit(0);
});
