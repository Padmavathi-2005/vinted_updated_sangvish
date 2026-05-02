const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const Admin = require('./models/Admin');

const testSecret = process.env.JWT_SECRET || 'secret123';

async function checkAdmin(email) {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            console.log('Admin not found in DB');
            return;
        }
        console.log('Found Admin:', { id: admin._id, email: admin.email });

        const token = jwt.sign({ id: admin._id, role: 'admin' }, testSecret, { expiresIn: '30d' });
        console.log('Generated token for this admin:', token);

        const decoded = jwt.verify(token, testSecret);
        console.log('Decoded ID:', decoded.id);

        const verifiedAdmin = await Admin.findById(decoded.id);
        console.log('Verified Admin findById:', verifiedAdmin ? 'YES' : 'NO');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

// Replace with the admin email you are using
checkAdmin('admin@gmail.com');
