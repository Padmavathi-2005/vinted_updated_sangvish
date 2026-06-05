const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateCourier() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['profile.tracking_info'] = '?????? ?????? ??????';
        trans['profile.item_price'] = '??? ??????';
        trans['profile.shipping_partner'] = '???? ?????';
        trans['profile.standard_shipping'] = '??? ????';
        trans['profile.tracking_number'] = '??? ??????';
        trans['profile.na'] = '??? ????';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for courier details to DB!');
    }
    
    process.exit(0);
}

translateCourier().catch(console.error);
