import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const updateAdminPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@gmail.com';
        const newPassword = 'admin'; // User requested 'admin'
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const admin = await Admin.findOneAndUpdate(
            { email: email },
            { password_hash: hashedPassword },
            { new: true, upsert: true }
        );

        console.log('Admin password updated successfully for:', email);
        console.log('New Password is: admin');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

updateAdminPassword();
