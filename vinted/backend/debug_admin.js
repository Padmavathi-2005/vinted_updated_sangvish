const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

const debugAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Admin = mongoose.connection.db.collection('admins');
        const adminDoc = await Admin.findOne({ email: 'admin@gmail.com' });

        if (adminDoc) {
            console.log('Admin found:', adminDoc.email);
            console.log('Has password_hash:', !!adminDoc.password_hash);
        } else {
            console.log('Admin NOT found in "admins" collection with email admin@gmail.com');
            const allAdmins = await Admin.find({}).toArray();
            console.log('All docs in "admins":', allAdmins.map(a => a.email));
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugAdmin();
