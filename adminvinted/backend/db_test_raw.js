import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const test = async () => {
    try {
        console.log('Connecting...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('Connected to:', mongoose.connection.name);
        console.log('ReadyState:', mongoose.connection.readyState);

        console.log('Querying purely through mongoose.connection.db...');
        const count = await mongoose.connection.db.collection('categories').countDocuments();
        console.log('Count:', count);

        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

test();
