import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    const countSold = await db.collection('items').countDocuments({is_sold: true});
    console.log('is_sold=true:', countSold);
    
    const countFalse = await db.collection('items').countDocuments({is_sold: false});
    console.log('is_sold=false:', countFalse);
    
    const countMissing = await db.collection('items').countDocuments({is_sold: {$exists: false}});
    console.log('is_sold missing:', countMissing);
    
    process.exit(0);
}
run();
