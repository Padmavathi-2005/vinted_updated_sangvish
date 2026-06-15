import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";

mongoose.connect(MONGO_URI).then(async () => {
    const Item = mongoose.connection.collection('items');
    
    // Fix the specific handbag item or any items with 'available' status
    const result = await Item.updateMany(
        { status: 'available' },
        { $set: { status: 'active', is_sold: false, is_ordered: false } }
    );
    
    console.log(`Updated ${result.modifiedCount} items from 'available' to 'active'`);
    
    // Specifically search for handbag and make sure it's active
    const handbagResult = await Item.updateMany(
        { title: { $regex: /handbag/i }, is_deleted: false },
        { $set: { status: 'active', is_sold: false, is_ordered: false } }
    );
    
    console.log(`Forced ${handbagResult.modifiedCount} handbag items to be 'active' and unsold`);
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
