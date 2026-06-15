import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import Wallet from '../models/Wallet.js';

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
    const wallets = await Wallet.find({ balance: { $lt: 0 } });
    console.log(wallets);
    process.exit();
});
