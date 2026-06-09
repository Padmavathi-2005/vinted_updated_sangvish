const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const translations = {
    en: "Bundle Discount",
    pt: "Desconto de Pacote",
    es: "Descuento de Lote",
    de: "Paket-Rabatt",
    fr: "Remise sur lot",
    it: "Sconto pacchetto",
    nl: "Bundelkorting",
    ru: "Скидка на комплект",
    zh: "组合折扣",
    ja: "セット割引",
    ko: "묶음 할인",
    hi: "बंडल डिस्काउंट",
    bn: "বান্ডেল ছাড়",
    ta: "கூட்டுத் தள்ளுபடி",
    ar: "خصم الحزمة",
    tr: "Paket İndirimi",
    ur: "بنڈل ڈسکاؤنٹ",
    vi: "Giảm giá combo",
    id: "Diskon Bundel",
    pl: "Rabat na zestaw",
    sv: "Paketrabatt"
};

// Paths to locate translation.json
const paths = [
    'g:/vinted-updated/vinted/src/locales',
    'g:/vinted-updated/vinted/backend/locales',
    'g:/vinted-updated/vinted-next/locales'
];

async function updateLocalFiles() {
    for (const localesDir of paths) {
        if (!fs.existsSync(localesDir)) {
            console.log(`Locales directory ${localesDir} does not exist. Skipping...`);
            continue;
        }
        
        const langs = fs.readdirSync(localesDir);
        for (const lang of langs) {
            const filePath = path.join(localesDir, lang, 'translation.json');
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const json = JSON.parse(content);
                    
                    // 1. Ensure "checkout" object exists
                    if (!json.checkout) {
                        json.checkout = {};
                    }
                    
                    // 2. Add bundle_discount translation to checkout
                    const translationVal = translations[lang] || translations['en'];
                    json.checkout.bundle_discount = translationVal;
                    
                    // 3. For vinted-next, also make sure it exists in "cart" if that block is present
                    if (json.cart) {
                        json.cart.bundle_discount = translationVal;
                    }
                    
                    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
                    console.log(`Updated local file: ${filePath}`);
                } catch (e) {
                    console.error(`Error updating local file ${filePath}:`, e.message);
                }
            }
        }
    }
}

const languageSchema = new mongoose.Schema({
    name: String,
    code: String,
    translations: mongoose.Schema.Types.Mixed
}, { collection: 'languages' });

const Language = mongoose.model('Language', languageSchema);

async function updateDatabase() {
    if (!process.env.MONGO_URI) {
        console.log("No MONGO_URI found in env. Skipping database updates.");
        return;
    }
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");
        
        const langs = await Language.find({});
        for (const lang of langs) {
            const code = lang.code;
            const translationVal = translations[code] || translations['en'];
            
            let currentTrans = lang.translations || {};
            
            // Add checkout.bundle_discount to database translations
            currentTrans['checkout.bundle_discount'] = translationVal;
            
            // Also add cart.bundle_discount just in case
            currentTrans['cart.bundle_discount'] = translationVal;
            
            lang.translations = currentTrans;
            lang.markModified('translations');
            await lang.save();
            console.log(`Updated DB translations for language: ${code}`);
        }
    } catch (e) {
        console.error("Error updating database translations:", e.message);
    }
}

async function run() {
    await updateLocalFiles();
    await updateDatabase();
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
