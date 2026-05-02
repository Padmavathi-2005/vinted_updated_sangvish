
const fs = require('fs');
const content = fs.readFileSync('e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx', 'utf8');
const lines = content.split('\n');
const stack = [];

lines.forEach((line, i) => {
    const l_idx = i + 1;
    const opens = line.match(/<div(\s|>)(?![^>]*\/>)/g) || []; // Opening but NOT self-closing
    // Wait, regex for not self-closing is hard.
    // Let's use simpler:
    const all_opens = line.match(/<div(\s|>)/g) || [];
    const self_closes = line.match(/<div(\s|[^>])*?\/>/g) || [];
    const closes = line.match(/<\/div\s*>/g) || [];

    for (let j = 0; j < all_opens.length - self_closes.length; j++) {
        stack.push({ l_idx, line });
    }
    for (let j = 0; j < closes.length; j++) {
        if (stack.length > 0) stack.pop();
        else console.log(`Extra close at ${l_idx}`);
    }
    if (l_idx >= 1075 && l_idx <= 1086) {
        console.log(`L${l_idx}: opens=${all_opens.length}, self=${self_closes.length}, closes=${closes.length}, stack_size=${stack.length}`);
    }
});
console.log('Final stack:', stack.map(s => s.l_idx));
