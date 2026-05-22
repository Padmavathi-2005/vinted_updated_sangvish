import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@gmail.com';
        const newPassword = '12345678';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        try {
            await Admin.collection.dropIndex('username_1');
        } catch (e) {
            console.log('Index username_1 does not exist or already dropped');
        }

        // First find if admin exists
        const existingAdmin = await Admin.findOne({ email: email });

        if (existingAdmin) {
            existingAdmin.password_hash = hashedPassword;
            await existingAdmin.save();
            console.log('Admin password updated successfully for:', email);
            console.log('Admin details:', { email: existingAdmin.email, name: existingAdmin.name });
        } else {
            // Since there's a unique username index but no username field in schema,
            // creating a new admin might fail if it tries to insert null/undefined
            // Let's create it with required fields
            const newAdmin = new Admin({
                email: email,
                password_hash: hashedPassword,
                name: 'Admin User' // Provide a default name
            });
            await newAdmin.save();
            console.log('New admin created successfully:', email);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetAdmin();
