
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
        if (stack.length > 0) stack.pop();
    }

    if (l_idx === 1023 || l_idx === 1086 || l_idx === 1450) {
        console.log(`L${l_idx} Stack:`, stack);
    }
});
