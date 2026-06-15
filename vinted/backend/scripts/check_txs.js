import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
    const txs = await Transaction.find({ wallet_id: '699d80e78aeed8ee2629de38' }).sort({ created_at: -1 }).limit(10);
    console.log("Transactions:");
    for (const t of txs) {
        console.log(`Type: ${t.type}, Purpose: ${t.purpose}, Amount: ${t.amount}, Source: ${t.source_currency}, Status: ${t.status}`);
    }
    process.exit();
});
