const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateOrderDetails() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['profile.request_return'] = '??? ?????';
        trans['profile.return_deadline'] = '???? {{days}} ??? (????) ?????? ???? ????? ??? ?? ??? ?????? ??? ?? ?????.';
        trans['profile.request_return_btn'] = '??? ?????';
        trans['profile.paid'] = '?????';
        
        trans['order.ordered'] = '?? ?????';
        trans['order.confirmed'] = '?? ???????';
        trans['order.packed'] = '?? ???????';
        trans['order.shipped'] = '?? ?????';
        trans['order.delivered'] = '?? ???????';
        trans['order.cancelled'] = '?? ???????';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for Order Details Modal to DB!');
    }
    
    process.exit(0);
}

translateOrderDetails().catch(console.error);
