import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });

        const schema = new mongoose.Schema({ name: String });
        // Create model here inline
        const TestModel = mongoose.model('TestCat', schema, 'categories');

        console.log('Querying inline model...');
        const count = await TestModel.countDocuments();
        console.log('Count inline:', count);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

test();
