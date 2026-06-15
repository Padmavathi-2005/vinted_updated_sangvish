import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import User from '../models/User.js';

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
    const users = await User.find({ pending_balance: { $lt: 0 } });
    console.log(users);
    process.exit();
});
