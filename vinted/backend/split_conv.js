import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vinted';

async function fix() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const messages = db.collection('messages');
        const conversations = db.collection('conversations');
        const items = db.collection('items');

        // 1. Identify the high-value item (e.g., Gucci)
        const luxuryItem = await items.findOne({ price: { $gt: 5000 } });
        if (!luxuryItem) {
            console.log('Luxury item not found');
            process.exit(0);
        }
        console.log('Luxury Item:', luxuryItem.title, luxuryItem._id);

        // 2. Find messages that should belong to this item but are in the wrong conversation
        const targetMessages = await messages.find({ 
            $or: [
                { offer_amount: { $gt: 5000 } },
                { item_id: luxuryItem._id }
            ]
        }).toArray();

        if (targetMessages.length === 0) {
            console.log('No mismatched messages found');
            process.exit(0);
        }

        const oldConvId = targetMessages[0].conversation_id;
        const senderId = targetMessages[0].sender_id;
        const receiverId = targetMessages[0].receiver_id;

        // 3. Create a NEW conversation specifically for the luxury item
        const newConv = await conversations.insertOne({
            participants: [
                { user: senderId, on_model: 'User' },
                { user: receiverId, on_model: 'User' }
            ],
            item_id: luxuryItem._id,
            status: 'accepted',
            initiator_id: senderId,
            initiator_model: 'User',
            last_message: targetMessages[targetMessages.length - 1].message,
            last_message_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        });

        const newConvId = newConv.insertedId;
        console.log('Created new conversation:', newConvId);

        // 4. Move the messages to the new conversation
        const moveResult = await messages.updateMany(
            { _id: { $in: targetMessages.map(m => m._id) } },
            { $set: { conversation_id: newConvId, item_id: luxuryItem._id } }
        );
        console.log(`Moved ${moveResult.modifiedCount} messages to the new conversation.`);

        // 5. Update the old conversation to be clean (only Shoes kids)
        const shoesItem = await items.findOne({ title: /Shoes/i });
        if (shoesItem) {
            await conversations.updateOne(
                { _id: oldConvId },
                { $set: { item_id: shoesItem._id } }
            );
            await messages.updateMany(
                { conversation_id: oldConvId },
                { $set: { item_id: shoesItem._id } }
            );
            console.log('Restored old conversation to Shoes context.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
