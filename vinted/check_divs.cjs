
const fs = require('fs');

const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
const stack = [];

lines.forEach((line, i) => {
    // Only count opening divs that are NOT self-closing
    const openMatches = line.match(/<div(\s|>)/g) || [];
    const selfCloseMatches = line.match(/<div(\s|[^>])*?\/>/g) || [];

    for (let j = 0; j < openMatches.length - selfCloseMatches.length; j++) {
        stack.push(i + 1);
    }

    const closeMatches = line.match(/<\/div(\s|>)/g) || [];
    for (let j = 0; j < closeMatches.length; j++) {
        if (stack.length > 0) {
            stack.pop();
        } else {
            console.log(`Extra closing div at line ${i + 1}`);
        }
    }
});

if (stack.length > 0) {
    console.log(`Unclosed divs at lines:`, stack);
} else {
    console.log(`All divs closed!`);
}
