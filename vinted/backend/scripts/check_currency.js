import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
    const users = await User.find({ balance: { $ne: 0 } }, 'balance wallet_currency');
    const wallets = await Wallet.find({ balance: { $ne: 0 } }, 'owner_id balance currency');
    console.log("Users:", users);
    console.log("Wallets:", wallets);
    process.exit();
});
