import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    const countFalse = await db.collection('items').countDocuments({is_deleted: false});
    console.log('is_deleted=false:', countFalse);
    
    const countMissing = await db.collection('items').countDocuments({is_deleted: {$exists: false}});
    console.log('is_deleted missing:', countMissing);
    
    process.exit(0);
}
run();
