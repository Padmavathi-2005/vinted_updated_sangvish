
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const userTernaryIndex = lines.findIndex(l => l.includes('{user ? ('));
if (userTernaryIndex !== -1) {
    // Check if the lines before it are missing closures
    if (!lines[userTernaryIndex - 1].includes(')}')) {
        lines.splice(userTernaryIndex, 0, '                            </>', '                        )}');
        fs.writeFileSync(path, lines.join('\n'));
        console.log('Restored closures!');
    } else {
        console.log('Closures already exist!');
    }
} else {
    console.log('User ternary not found!');
}
