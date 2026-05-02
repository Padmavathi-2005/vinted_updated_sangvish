import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './config/db.js';

// Import exactly what server.js imports to mimic the environment
import adminRoutes from './routes/adminRoutes.js';

const test = async () => {
    try {
        await connectDB();

        console.log('Querying from imported routes/controllers...');
        // Let's manually trigger the verifyAdmin logic
        // Need to import Admin
        const Admin = (await import('./models/Admin.js')).default;
        console.log('Admin model loaded.');

        console.log('Querying Admin...');
        const count = await Admin.countDocuments();
        console.log('Admin count:', count);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

test();
