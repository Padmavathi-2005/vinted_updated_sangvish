
import mongoose from 'mongoose';

const newUri = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";

const test = async () => {
    try {
        console.log('Connecting to NEW DB...');
        await mongoose.connect(newUri);
        console.log('SUCCESS: Connected to NEW DB!');
        await mongoose.disconnect();
    } catch (err) {
        console.error('FAILURE: Could not connect to NEW DB:', err);
    }
};

test();
