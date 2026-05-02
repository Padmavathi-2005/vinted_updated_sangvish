import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrate = async () => {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('paymentmethods');

        const methods = await collection.find({}).toArray();
        console.log(`Found ${methods.length} payment methods in raw collection`);

        for (const method of methods) {
            let updateObj = {};
            let updated = false;

            if (typeof method.name === 'string') {
                updateObj.name = { en: method.name };
                updated = true;
                console.log(`Migrating name for ${method.name}`);
            }

            if (typeof method.description === 'string') {
                updateObj.description = { en: method.description };
                updated = true;
                console.log(`Migrating description for ${method.key}`);
            }

            if (updated) {
                await collection.updateOne({ _id: method._id }, { $set: updateObj });
                console.log(`Updated ${method.key || method._id}`);
            }
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
