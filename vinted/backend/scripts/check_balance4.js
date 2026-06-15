import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
    const users = await User.find({}, 'username email balance favorites_count');
    const buggyUsers = users.filter(u => String(u.balance).includes('830') || u.favorites_count === 3);
    console.log("Users with favorites=3 or balance with 830:");
    console.log(buggyUsers);

    const wallets = await Wallet.find({});
    const buggyWallets = wallets.filter(w => String(w.balance).includes('830'));
    console.log("Wallets with balance containing 830:");
    console.log(buggyWallets);
    
    process.exit();
});
