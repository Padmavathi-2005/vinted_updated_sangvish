import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    const countOrdered = await db.collection('items').countDocuments({is_ordered: true});
    console.log('is_ordered=true:', countOrdered);
    
    const countFalse = await db.collection('items').countDocuments({is_ordered: false});
    console.log('is_ordered=false:', countFalse);
    
    const countMissing = await db.collection('items').countDocuments({is_ordered: {$exists: false}});
    console.log('is_ordered missing:', countMissing);
    
    process.exit(0);
}
run();
