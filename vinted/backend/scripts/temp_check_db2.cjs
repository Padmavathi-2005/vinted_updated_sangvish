const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function checkDB() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const settings = await db.collection('settings').findOne({ type: 'social_login_settings' });
    console.log(JSON.stringify(settings, null, 2));
    process.exit(0);
}

checkDB().catch(console.error);
