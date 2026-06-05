const mongoose = require('mongoose');
const Setting = require('g:/vinted-updated/vinted/backend/models/Setting.js').default;
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function fixSocialSave() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // The issue might be that type: 'social_login_settings' doesn't exist? No, I verified it exists.
    // Let's modify the settingController.js directly through node to see what happens when the logic runs.
    
    let setting = await Setting.findOne({ type: 'social_login_settings' });
    console.log("Before save:", setting.google_client_id);
    
    const val = '12345-NEW-ID';
    if ('google_client_id'.endsWith('_id')) {
        setting.set('google_client_id', val);
    }
    
    await setting.save();
    console.log("After save:", setting.google_client_id);
    
    let setting2 = await Setting.findOne({ type: 'social_login_settings' });
    console.log("Reloaded from DB:", setting2.google_client_id);
    
    process.exit(0);
}

fixSocialSave().catch(console.error);
