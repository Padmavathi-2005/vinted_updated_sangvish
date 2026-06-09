const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function checkTranslations() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const langs = await Language.find({});
    console.log(`Found ${langs.length} languages in DB.`);
    
    for (let lang of langs) {
        const transKeys = lang.translations ? Object.keys(lang.translations) : [];
        console.log(`Language ${lang.code} (${lang.name}): has ${transKeys.length} translations in DB`);
        const bundleKeys = transKeys.filter(k => k.includes('bundle_discount'));
        if (bundleKeys.length > 0) {
            console.log(`  -> Found bundle_discount keys:`, bundleKeys.map(k => `${k}: "${lang.translations[k]}"`));
        }
    }
    
    process.exit(0);
}

checkTranslations().catch(console.error);
