const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateAIColor() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['sell_item.ai_color_prefix'] = '??? ???? ?????? ????? ??????? ???????? ?????';
        trans['sell_item.ai_color_suffix'] = '???? ???????!';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for AI color notification to DB!');
    }
    
    process.exit(0);
}

translateAIColor().catch(console.error);
