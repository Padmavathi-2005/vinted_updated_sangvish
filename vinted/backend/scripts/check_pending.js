import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import User from '../models/User.js';

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
    const user = await User.findById('65d1a101a1b2345678900001');
    console.log("Balance:", user.balance);
    console.log("Pending:", user.pending_balance);
    process.exit();
});
