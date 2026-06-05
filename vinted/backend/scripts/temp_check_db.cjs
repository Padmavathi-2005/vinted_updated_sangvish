const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function checkDB() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const settings = await db.collection('settings').find({ type: 'social_login_settings' }).toArray();
    console.log(JSON.stringify(settings, null, 2));
    
    // Also check if general_settings has google_client_secret
    const gen_settings = await db.collection('settings').findOne({ type: 'general_settings' });
    if(gen_settings) {
        console.log("general_settings has google_client_secret?", gen_settings.google_client_secret ? "YES" : "NO");
    }
    
    process.exit(0);
}

checkDB().catch(console.error);
