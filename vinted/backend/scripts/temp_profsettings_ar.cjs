const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateProfileSettings() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['profile.first_name'] = '????? ?????';
        trans['profile.last_name'] = '????? ??????';
        trans['profile.display_name'] = '??? ?????';
        trans['profile.eg_john'] = '??? ???? ?????? ???';
        trans['profile.eg_doe'] = '??? ???? ?????? ??';
        trans['profile.enter_username'] = '???? ??? ?????';
        trans['profile.display_name_hint'] = '??? ?? ???? ??? ????? ?????? ?????? ??? ??????.';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for Profile Settings to DB!');
    }
    
    process.exit(0);
}

translateProfileSettings().catch(console.error);
