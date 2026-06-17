import fs from 'fs';
import https from 'https';

const enPath = './locales/en/translation.json';
const dePaths = [
    './locales/de/translation.json',
    '../../vinted-next/locales/de/translation.json',
    '../src/locales/de/translation.json'
];

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Helper to chunk text
async function translateText(text, sourceLang = 'en', targetLang = 'de') {
    return new Promise((resolve, reject) => {
        // Handle interpolations like {{count}} to avoid translating them
        // Let's just rely on Google Translate keeping {{}} intact, or we can temporarily replace them
        const placeholders = [];
        let modifiedText = text.replace(/\{\{.*?\}\}/g, (match) => {
            placeholders.push(match);
            return `__VAR${placeholders.length - 1}__`;
        });

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(modifiedText)}`;
        
        https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    let translated = '';
                    if (parsed && parsed[0]) {
                        for (const sentence of parsed[0]) {
                            if (sentence[0]) translated += sentence[0];
                        }
                    }
                    
                    // Restore placeholders
                    let restoredText = translated.replace(/__VAR(\d+)__/g, (match, index) => {
                        return placeholders[parseInt(index, 10)] || match;
                    });
                    // Restore slightly mangled placeholders like __VAR0 __
                    restoredText = restoredText.replace(/__VAR (\d+) __/g, (match, index) => {
                        return placeholders[parseInt(index, 10)] || match;
                    });
                    
                    resolve(restoredText || text);
                } catch (e) {
                    console.error("Translation parse error for", text, e);
                    resolve(text);
                }
            });
        }).on('error', (e) => {
            console.error("Network error:", e);
            resolve(text);
        });
    });
}

// recursively translate
async function translateObject(obj) {
    const result = {};
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            const trans = await translateText(obj[key]);
            result[key] = trans;
            process.stdout.write('.');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            result[key] = await translateObject(obj[key]);
        } else {
            result[key] = obj[key];
        }
    }
    return result;
}

async function run() {
    console.log("Starting translation...");
    const translatedData = await translateObject(enData);
    console.log("\nSaving to files...");
    
    for (const p of dePaths) {
        try {
            if (fs.existsSync(p.substring(0, p.lastIndexOf('/')))) {
                fs.writeFileSync(p, JSON.stringify(translatedData, null, 4));
                console.log("Written to", p);
            }
        } catch(e) {
            console.error("Failed to write to", p);
        }
    }
    console.log("Complete!");
}

run();
