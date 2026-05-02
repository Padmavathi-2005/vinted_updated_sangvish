
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
let stack = [];

lines.forEach((line, i) => {
    let l_idx = i + 1;
    let opens = (line.match(/<div(\s|>)/g) || []).length;
    let selfCloses = (line.match(/<div(\s|[^>])*?\/>/g) || []).length;
    let closes = (line.match(/<\/div\s*>/g) || []).length;

    for (let j = 0; j < opens - selfCloses; j++) {
        stack.push(l_idx);
    }
    for (let j = 0; j < closes; j++) {
        if (stack.length > 0) {
            stack.pop();
        } else {
            console.log(`Extra close at L${l_idx}`);
        }
    }

    if (l_idx >= 1080 && l_idx <= 1095) {
        console.log(`L${l_idx} [S:${stack.length}]: ${line.trim()}`);
    }
});

console.log('Final stack:', stack);
