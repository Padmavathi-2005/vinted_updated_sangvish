const fs = require('fs');
const path = require('path');

const localesDir = 'e:/vinted-user&admin/vinted/frontend/src/locales';
const subdirs = fs.readdirSync(localesDir);

subdirs.forEach(lang => {
    const filePath = path.join(localesDir, lang, 'translation.json');
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            let json = JSON.parse(content);
            if (json.home && json.home.load_more) {
                const oldValue = json.home.load_more;
                delete json.home.load_more;

                // For 'en', use 'See more'. For others, convert if it looks like English, 
                // or just keep original value but with new key.
                let newValue = oldValue;
                if (lang === 'en' || oldValue.toLowerCase() === 'load more') {
                    newValue = 'See more';
                }

                json.home.see_more = newValue;
                fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
                console.log(`Updated ${lang}/translation.json`);
            }
        } catch (err) {
            console.error(`Error processing ${lang}:`, err.message);
        }
    }
});
