
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;

const test = async () => {
    try {
        console.log('Testing connection to:', uri);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected successfully!');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        process.exit(0);
    } catch (e) {
        console.error('❌ Connection failed:', e.message);
        process.exit(1);
    }
};

test();
