const mongoose = require('mongoose');
const Setting = require('g:/vinted-updated/vinted/backend/models/Setting.js').default;
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    let setting = await Setting.findOne({ type: 'social_login_settings' });
    console.log(JSON.stringify(setting, null, 2));
    process.exit(0);
}
check().catch(console.error);
