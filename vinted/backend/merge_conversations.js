import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vinted';

async function merge() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const conversations = db.collection('conversations');
        const messages = db.collection('messages');

        const allConvs = await conversations.find({}).toArray();
        console.log(`Fetched ${allConvs.length} total conversations.`);

        // Map to group conversations by participants
        const groups = new Map();

        for (const conv of allConvs) {
            if (!conv.participants || conv.participants.length < 2) {
                console.log(`Skipping malformed conversation: ${conv._id}`);
                continue;
            }

            // Normalize and sort participant IDs to create a unique key
            const key = conv.participants
                .map(p => {
                    const idStr = p.user ? (p.user._id ? p.user._id.toString() : p.user.toString()) : '';
                    const model = p.on_model || 'User';
                    return `${idStr}:${model}`;
                })
                .sort()
                .join('|');

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(conv);
        }

        console.log(`Grouped into ${groups.size} unique user-to-user pairs.`);

        let mergedCount = 0;

        for (const [key, group] of groups.entries()) {
            if (group.length <= 1) continue;

            console.log(`\nFound duplicate conversations for key: [ ${key} ] - Count: ${group.length}`);

            // Sort by creation date or message count. Let's sort so the oldest/first conversation is the primary
            group.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

            const primary = group[0];
            const secondaries = group.slice(1);

            console.log(`Primary Conversation: ${primary._id} (Created: ${primary.created_at})`);

            for (const secondary of secondaries) {
                console.log(`  Merging secondary conversation: ${secondary._id} -> ${primary._id}`);

                // Update all messages from secondary to primary conversation
                const updateRes = await messages.updateMany(
                    { conversation_id: secondary._id },
                    { $set: { conversation_id: primary._id } }
                );

                console.log(`    Moved ${updateRes.modifiedCount} messages.`);

                // Delete the secondary conversation
                await conversations.deleteOne({ _id: secondary._id });
                mergedCount++;
            }

            // Update the primary conversation's last_message and last_message_at based on actual messages
            const lastMsg = await messages.findOne(
                { conversation_id: primary._id },
                { sort: { created_at: -1 } }
            );

            if (lastMsg) {
                await conversations.updateOne(
                    { _id: primary._id },
                    {
                        $set: {
                            last_message: lastMsg.message,
                            last_message_at: lastMsg.created_at,
                            item_id: lastMsg.item_id || primary.item_id
                        }
                    }
                );
                console.log(`  Updated primary conversation with last message: "${lastMsg.message}"`);
            }
        }

        console.log(`\nMerge script complete. Merged/Deleted ${mergedCount} duplicate conversations.`);
        process.exit(0);
    } catch (e) {
        console.error('Merge script error:', e);
        process.exit(1);
    }
}

merge();
