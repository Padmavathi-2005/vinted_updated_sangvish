import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/vinted').then(async () => {
    const Item = mongoose.connection.collection('items');
    const items = await Item.find({ title: { $regex: /handbag/i } }).toArray();
    console.log(JSON.stringify(items, null, 2));
    process.exit(0);
}).catch(console.error);
