import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './config/db.js';

const test = async () => {
    try {
        await connectDB();

        const Admin = (await import('./models/Admin.js')).default;

        console.log('Mongoose Global Connection ReadyState:', mongoose.connection.readyState);
        console.log('Admin Model DB ReadyState:', Admin.db.readyState);
        console.log('Are connections the same?', Admin.db === mongoose.connection);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

test();
