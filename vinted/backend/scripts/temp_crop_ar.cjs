const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function translateCrop() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let ar = await Language.findOne({ code: 'ar' });
    if (ar) {
        let trans = ar.translations || {};
        
        trans['crop.crop_image'] = '?? ??????';
        trans['crop.upload_original'] = '????? ?????? (???? ??)';
        trans['crop.help_tip'] = '?? ?????? ???? ?????? ??? ????? ???? ????? ??????.';
        trans['crop.original_ratio'] = '?????? ???????';
        trans['crop.aspect_ratio'] = '???? ????? ??? ????????:';
        trans['crop.zoom'] = '?????';
        trans['crop.rotate'] = '?????';
        trans['crop.apply_crop'] = '????? ????';
        trans['crop.cancel'] = '?????';
        
        ar.translations = trans;
        ar.markModified('translations');
        await ar.save();
        
        console.log('Successfully saved Arabic translations for crop modal to DB!');
    }
    
    process.exit(0);
}

translateCrop().catch(console.error);
