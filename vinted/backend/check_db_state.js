import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './models/User.js';
import './models/Admin.js';
import './models/Message.js';
import Conversation from './models/Conversation.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function check() {
    try {
        console.log('Connecting to:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected');

        const convs = await Conversation.find({}).lean();
        console.log(`Total conversations: ${convs.length}`);
        if (convs.length > 0) {
            console.log('First conversation participants:', JSON.stringify(convs[0].participants, null, 2));
        }

        const users = await mongoose.model('User').find({}).limit(5).select('_id username').lean();
        console.log('Sample Users:', JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
