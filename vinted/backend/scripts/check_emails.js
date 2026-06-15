import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const User = mongoose.connection.collection('users');
        const users = await User.find({ email: /buyer/i }).toArray();
        console.log("Users with 'buyer' in email:");
        users.forEach(u => console.log(u._id, u.email));
        mongoose.disconnect();
    })
    .catch(err => console.error(err));
