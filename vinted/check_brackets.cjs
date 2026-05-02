
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
const content = fs.readFileSync(path, 'utf8');

function check(charOpen, charClose) {
    let count = 0;
    let stack = [];
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        for (let j = 0; j < line.length; j++) {
            if (line[j] === charOpen) stack.push(i + 1);
            if (line[j] === charClose) if (stack.length > 0) stack.pop(); else console.log(`Extra close ${charClose} at L${i + 1}`);
        }
    });
    console.log(`Unclosed ${charOpen}:`, stack.length);
    if (stack.length > 0) {
        console.log(`First few unclosed ${charOpen} at lines:`, stack.slice(0, 5));
    }
}

console.log('--- Brackets check ---');
check('{', '}');
check('(', ')');
check('[', ']');
