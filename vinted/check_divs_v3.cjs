
const fs = require('fs');
const content = fs.readFileSync('e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx', 'utf8');
const lines = content.split('\n');
const stack = [];

lines.forEach((line, i) => {
    // Opening tags correctly matching common JSX formatting
    const opens = line.match(/<div(\s|>)/g) || [];
    const selfCloses = line.match(/<div(\s|[^>])*?\/>/g) || [];
    const closes = line.match(/<\/div\s*>/g) || [];

    for (let j = 0; j < opens.length - selfCloses.length; j++) {
        stack.push(i + 1);
    }
    for (let j = 0; j < closes.length; j++) {
        if (stack.length > 0) stack.pop();
        else console.log(`Extra close at line ${i + 1}`);
    }
});

console.log('Final stack (line numbers of unclosed divs):', stack);
