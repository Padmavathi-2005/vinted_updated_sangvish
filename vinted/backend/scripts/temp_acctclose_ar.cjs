const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateAccountClosure() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['common.save_changes'] = '??? ?????????';
        trans['common.saving'] = '???? ?????...';
        trans['common.cancel'] = '?????';
        trans['profile.account_closure'] = '????? ?????? ?????????';
        trans['profile.account_deletion_warning'] = '????? ????? ?????? ???? ????? ??????? ???? ????. ???? ??????.';
        trans['profile.delete_my_account'] = '????? ?????';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for Account Closure section to DB!');
    }
    
    process.exit(0);
}

translateAccountClosure().catch(console.error);
