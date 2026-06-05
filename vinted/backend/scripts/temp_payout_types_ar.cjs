const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translatePayoutTypes() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['wallet.payout_type_bank'] = '???';
        trans['wallet.payout_type_upi'] = '?? ?? ??';
        trans['wallet.payout_type_paypal'] = '??? ???';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for Payout Types to DB!');
    }
    
    process.exit(0);
}

translatePayoutTypes().catch(console.error);
