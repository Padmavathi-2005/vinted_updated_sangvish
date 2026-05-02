import mongoose from 'mongoose';
import Notification from './models/Notification.js';

const MONGO_URI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

const test = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const count = await Notification.countDocuments();
        console.log(`Total notifications: ${count}`);

        const latest = await Notification.find().limit(5);
        console.log('Latest notifications:', JSON.stringify(latest, null, 2));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

test();
