import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const findData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        for (const coll of collections) {
            const collection = db.collection(coll.name);
            const found = await collection.findOne({
                $or: [
                    { name: /stripe/i },
                    { key: /stripe/i },
                    { title: /stripe/i },
                    { name: /paypal/i },
                    { key: /paypal/i },
                    { stripe_enabled: { $exists: true } }
                ]
            });
            if (found) {
                console.log(`Found in collection: ${coll.name}`);
                // console.log(JSON.stringify(found, null, 2));
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

findData();
