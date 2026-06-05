const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateOrders() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['profile.track_purchases'] = '???? ?????? ????????';
        trans['profile.manage_sales'] = '????? ??????? ???????';
        trans['profile.view_details'] = '??? ????????';
        
        // Order statuses (in case they are missing)
        trans['order_status.pending'] = '??? ????????';
        trans['order_status.confirmed'] = '????';
        trans['order_status.packed'] = '????';
        trans['order_status.shipped'] = '?????';
        trans['order_status.delivered'] = '?? ???????';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for Orders page to DB!');
    }
    
    process.exit(0);
}

translateOrders().catch(console.error);
