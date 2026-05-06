import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../vinted/backend/.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vinted';

async function fixCorruptedOffer() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Look for the specific corrupted offer from the screenshot:
        // Item: Shoes kids (around 250 price), Offer: 24
        
        const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }), 'messages');
        
        const result = await Message.updateMany(
            { 
                offer_amount: { $gt: 23, $lt: 25 }, 
                message_type: 'offer',
                message: /Offer of/
            },
            { $set: { offer_amount: 2000 } }
        );

        console.log(`Updated ${result.modifiedCount} messages.`);
        
        // Also update the system messages if any
        const systemResult = await Message.updateMany(
            { 
                message: /Offer of ₹24.00/
            },
            { $set: { message: '✅ Offer of ₹2000.00 was accepted!' } }
        );
        console.log(`Updated ${systemResult.modifiedCount} system messages.`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixCorruptedOffer();
