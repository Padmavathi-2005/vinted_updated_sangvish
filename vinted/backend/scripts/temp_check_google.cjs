const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function checkGoogleSettings() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const settings = await db.collection('settings').findOne({});
    console.log('Google Client ID in DB:', settings.google_client_id);
    process.exit(0);
}

checkGoogleSettings().catch(console.error);
