import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function fix() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db();
        const conversations = await db.collection('conversations').find({}).toArray();
        console.log(`Checking ${conversations.length} conversations...`);

        for (const conv of conversations) {
            console.log(`Processing conversation ${conv._id}...`);
            
            // Find messages for this conversation to get correct participant IDs
            const messages = await db.collection('messages').find({ conversation_id: conv._id }).toArray();
            
            const participantMap = new Map(); // id -> model

            // Also use initiator_id from conversation as a fallback/starting point
            if (conv.initiator_id) {
                participantMap.set(conv.initiator_id.toString(), conv.initiator_model || 'User');
            }

            // Extract from messages
            for (const msg of messages) {
                if (msg.sender_id) participantMap.set(msg.sender_id.toString(), msg.sender_model || 'User');
                if (msg.receiver_id) participantMap.set(msg.receiver_id.toString(), msg.receiver_model || 'User');
            }

            // If we still have fewer than 2 participants, it's a problem, but we'll do our best
            if (participantMap.size < 2) {
                console.warn(`Conversation ${conv._id} has only ${participantMap.size} unique participants found.`);
            }

            const newParticipants = Array.from(participantMap.entries()).map(([id, model]) => ({
                user: new ObjectId(id),
                on_model: model
            }));

            await db.collection('conversations').updateOne(
                { _id: conv._id },
                { $set: { participants: newParticipants } }
            );
            console.log(`Updated conversation ${conv._id} with ${newParticipants.length} participants.`);
        }

        console.log('Fix complete.');
    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await client.close();
        process.exit(0);
    }
}

fix();
