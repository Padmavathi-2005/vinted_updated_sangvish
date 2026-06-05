const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });
const Setting = require('g:/vinted-updated/vinted/backend/models/Setting.js').default;

async function checkSave() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        let setting = await Setting.findOne({ type: 'social_login_settings' });
        console.log("Found setting:", setting._id);
        setting.set('google_client_id', '1089149942287-TEST-ID.apps.googleusercontent.com');
        const res = await setting.save();
        console.log("Saved setting google_client_id:", res.google_client_id);
    } catch (e) {
        console.error("Save error:", e);
    }
    
    process.exit(0);
}

checkSave().catch(console.error);
