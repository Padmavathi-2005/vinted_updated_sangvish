import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

async function check() {
    await mongoose.connect(uri);
    
    const User = mongoose.connection.collection('users');
    const user = await User.findOne({ email: 'buyer@email.co' });
    console.log("EXACT MATCH buyer@email.co:", user);
    
    await mongoose.disconnect();
}

check().catch(console.error);
