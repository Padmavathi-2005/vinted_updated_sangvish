const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateMessages() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['profile.conv_status_pending'] = '??? ????????';
        trans['profile.conv_status_accepted'] = '?????';
        trans['profile.status_official'] = '????';
        trans['profile.status_updates'] = '???????';
        trans['profile.status_accepted'] = '?????';
        trans['profile.status_pending'] = '??? ????????';
        trans['profile.order_number'] = '??? #{{id}}';
        trans['time_ago.active_now'] = '??? ????';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for Messages Content to DB!');
    }
    
    process.exit(0);
}

translateMessages().catch(console.error);
