import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";

mongoose.connect(MONGO_URI).then(async () => {
    const Item = mongoose.connection.collection('items');
    const Order = mongoose.connection.collection('orders');
    const Negotiation = mongoose.connection.collection('negotiations');
    const Conversation = mongoose.connection.collection('conversations');
    
    const handbag = await Item.findOne({ title: { $regex: /handbag/i } });
    if (!handbag) {
        console.log('Handbag not found');
        process.exit(0);
    }
    
    const neg = await Negotiation.find({ item_id: handbag._id }).toArray();
    console.log('Negotiations:', neg);
    
    const conv = await Conversation.find({ item_id: handbag._id }).toArray();
    console.log('Conversations:', conv);

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
