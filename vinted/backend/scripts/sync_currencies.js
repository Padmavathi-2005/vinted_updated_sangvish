import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
    const wallets = await Wallet.find({});
    for(const w of wallets) {
        if(w.owner_type === 'User') {
            await User.findByIdAndUpdate(w.owner_id, { 
                $set: { 
                    wallet_currency: w.currency,
                    balance: w.balance,
                    pending_balance: w.pending_balance
                } 
            });
        }
    }
    console.log('Synced currencies and balances for all users');
    process.exit();
});
