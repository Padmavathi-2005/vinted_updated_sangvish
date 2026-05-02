const mongoose = require('mongoose');
require('dotenv').config();
const Conversation = require('./models/Conversation');
const User = require('./models/User');

async function createConv() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find().limit(2);
        if (users.length < 2) {
            console.log('Need 2 users');
            process.exit(1);
        }
        const conv = await Conversation.create({
            participants: [
                { user: users[0]._id, on_model: 'User' },
                { user: users[1]._id, on_model: 'User' }
            ],
            initiator_id: users[0]._id,
            initiator_model: 'User',
            last_message: 'Test message',
            last_message_at: Date.now(),
            status: 'pending'
        });
        console.log('Conv created:', conv._id);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createConv();
