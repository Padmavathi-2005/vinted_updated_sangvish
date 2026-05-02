import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Admin from './models/Admin.js';

const test = async () => {
    try {
        console.log('Connecting...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            family: 4
        });
        console.log('Connected.');

        console.log('Querying Admin...');
        const admin = await Admin.findOne({});
        console.log('Result:', admin ? admin.email : 'No admin found');

        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

test();
