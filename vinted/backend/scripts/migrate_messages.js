import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Define Schemas (Simplified for migration)
const ConversationSchema = new mongoose.Schema({
    item_id: mongoose.Schema.Types.ObjectId
});
const MessageSchema = new mongoose.Schema({
    conversation_id: mongoose.Schema.Types.ObjectId,
    item_id: mongoose.Schema.Types.ObjectId
});

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vinted');
        console.log('Connected to MongoDB');

        const conversations = await Conversation.find({ item_id: { $ne: null } });
        console.log(`Found ${conversations.length} conversations with linked items.`);

        let updatedCount = 0;
        for (const conv of conversations) {
            const result = await Message.updateMany(
                { conversation_id: conv._id, item_id: null },
                { $set: { item_id: conv.item_id } }
            );
            updatedCount += result.modifiedCount;
        }

        console.log(`Migration complete. Updated ${updatedCount} messages.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
