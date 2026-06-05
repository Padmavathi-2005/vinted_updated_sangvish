const mongoose = require('mongoose');
const Setting = require('g:/vinted-updated/vinted/backend/models/Setting.js').default;
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function fixSocialSave() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let setting = await Setting.findOne({ type: 'social_login_settings' });
    console.log("Before save:", setting.google_client_id);
    
    setting.set('google_client_id', null);
    await setting.save();
    
    let setting2 = await Setting.findOne({ type: 'social_login_settings' });
    console.log("After save:", setting2.google_client_id);
    
    process.exit(0);
}

fixSocialSave().catch(console.error);
