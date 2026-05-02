import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Category from './models/Category.js';

const test = async () => {
    try {
        console.log('Connecting...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('Connected to:', mongoose.connection.name);

        console.log('Querying Categories...');
        const count = await Category.countDocuments();
        console.log('Count:', count);

        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

test();
