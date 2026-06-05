const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateWallet() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['wallet.wallet'] = '???????';
        trans['wallet.transactions'] = '?????????';
        trans['wallet.withdraw'] = '???';
        trans['wallet.payout'] = '?????????';
        trans['wallet.full_refund_desc'] = '??????? ???? ????? ?????? {{id}}';
        trans['wallet.payment_for_order'] = '????? ????? {{id}}';
        trans['wallet.purpose_order_refund'] = '??????? ?????';
        trans['wallet.purpose_order_payment'] = '??? ?????';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for Wallet to DB!');
    }
    
    process.exit(0);
}

translateWallet().catch(console.error);
