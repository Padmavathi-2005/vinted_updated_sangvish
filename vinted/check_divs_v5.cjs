
const fs = require('fs');
const content = fs.readFileSync('e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx', 'utf8');
const lines = content.split('\n');
const stack = [];

lines.forEach((line, i) => {
    const l_idx = i + 1;
    const all_opens = line.match(/<div(\s|>)/g) || [];
    const self_closes = line.match(/<div(\s|[^>])*?\/>/g) || [];
    const closes = line.match(/<\/div\s*>/g) || [];

    for (let j = 0; j < all_opens.length - self_closes.length; j++) {
        stack.push(l_idx);
    }
    for (let j = 0; j < closes.length; j++) {
        if (stack.length > 0) stack.pop();
    }
    if (l_idx >= 1010 && l_idx <= 1030) {
        console.log(`L${l_idx}: opens=${all_opens.length}, closes=${closes.length}, stack=[${stack.join(',')}]`);
    }
});
