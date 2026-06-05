import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';

import User from './models/User.js';

mongoose.connect(process.env.LOCAL_MONGO_URI || process.env.MONGO_URI).then(async () => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('12345678', salt);
        
        await User.updateMany({}, { $set: { password_hash: hash } });
        console.log('Successfully reset all user passwords to 12345678');
    } catch(err) { console.error(err) }
    mongoose.connection.close();
});
