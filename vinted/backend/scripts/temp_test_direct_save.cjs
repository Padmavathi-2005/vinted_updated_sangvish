const mongoose = require('mongoose');
const Setting = require('g:/vinted-updated/vinted/backend/models/Setting.js').default;
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function checkSave() {
    await mongoose.connect(process.env.MONGO_URI);
    let setting = await Setting.findOne({ type: 'social_login_settings' });
    console.log("Setting found:", setting._id);
    
    setting.set('google_client_id', 'TEST-ID-1234');
    setting.set('google_enabled', true);
    console.log("Saving...");
    await setting.save();
    console.log("Saved!");
    process.exit(0);
}
checkSave().catch(console.error);
