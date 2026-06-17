import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';

dotenv.config();

const cleanAdminChats = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinted');
        console.log('Connected to MongoDB');

        // Find all conversations where ANY participant has on_model: 'Admin'
        const adminConversations = await Conversation.find({
            'participants.on_model': 'Admin'
        });

        console.log(`Found ${adminConversations.length} conversations involving Admin.`);

        const convIds = adminConversations.map(c => c._id);

        if (convIds.length > 0) {
            const msgResult = await Message.deleteMany({ conversation_id: { $in: convIds } });
            console.log(`Deleted ${msgResult.deletedCount} messages.`);

            const convResult = await Conversation.deleteMany({ _id: { $in: convIds } });
            console.log(`Deleted ${convResult.deletedCount} conversations.`);
        }

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanAdminChats();
