const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'adminvinted', 'src', 'locales');
const newSelectPrompt = "Choose a conversation from the list on the left to view the chat history.";
const newUser1 = "User 1";
const newUser2 = "User 2";

fs.readdirSync(localesDir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(localesDir, file);
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            let modified = false;
            
            if (!data.messages) {
                data.messages = {};
            }
            if (data.messages.select_prompt !== newSelectPrompt) {
                data.messages.select_prompt = newSelectPrompt;
                modified = true;
            }
            if (!data.messages.user_1) {
                data.messages.user_1 = newUser1;
                modified = true;
            }
            if (!data.messages.user_2) {
                data.messages.user_2 = newUser2;
                modified = true;
            }
            
            if (modified) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                console.log(`Updated ${file}`);
            }
        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
});
