import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
    const user = await User.findOne({ balance: { $lt: 0 } });
    if(user) {
        console.log('User ID:', user._id, 'Balance:', user.balance);
        const wallet = await Wallet.findOne({ owner_id: user._id });
        console.log('Wallet Balance:', wallet?.balance);
        const txns = await Transaction.find({ user_id: user._id });
        let calcBalance = 0;
        txns.forEach(t => {
            if(t.status === 'completed') {
                if(t.type === 'credit') calcBalance += t.amount;
                else if(t.type === 'debit') calcBalance -= t.amount;
            }
        });
        console.log('Calculated Balance:', calcBalance);
    } else {
        console.log('No users with negative balance found');
    }
    process.exit();
});
