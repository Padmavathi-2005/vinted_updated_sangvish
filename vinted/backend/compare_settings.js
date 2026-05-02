import mongoose from 'mongoose';

const mongoURIUser = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';
const mongoURIAdmin = 'mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted';

async function checkSettings(uri, name) {
    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        const settings = await conn.db.collection('settings').findOne({});
        console.log(`Settings in ${name}:`, JSON.stringify(settings, null, 2));
        await conn.close();
    } catch(e) {
        console.log(`Error in ${name}:`, e.message);
    }
}

async function run() {
    await checkSettings(mongoURIUser, 'User DB');
    await checkSettings(mongoURIAdmin, 'Admin DB');
    process.exit(0);
}

run();
