const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./models/User');

const testSecret = process.env.JWT_SECRET || 'secret123';

async function getUserToken() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne();
        if (!user) {
            console.log('No user found');
            process.exit(1);
        }
        const token = jwt.sign({ id: user._id }, testSecret, { expiresIn: '30d' });
        console.log(token);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getUserToken();
