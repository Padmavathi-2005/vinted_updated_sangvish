
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
const stack = [];

lines.forEach((line, i) => {
    const l_idx = i + 1;
    let temp = line;
    // Remove self-closing tags (simple heuristic)
    temp = temp.replace(/<[a-zA-Z0-9]+[^>]*\/>/g, '');

    // Find opens that are NOT part of a self-closing tag starting on this line
    const opens = temp.matchAll(/<([a-zA-Z0-9]+)(\s|>)/g);
    for (const match of opens) {
        const tag = match[1];
        if (tag === 'img' || tag === 'br' || tag === 'hr' || tag === 'input') continue;
        stack.push({ l_idx, tag, line: line.trim() });
    }

    const closes = temp.matchAll(/<\/([a-zA-Z0-9]+)>/g);
    for (const match of closes) {
        const tag = match[1];
        if (stack.length > 0) {
            const last = stack[stack.length - 1];
            if (last.tag === tag) {
                stack.pop();
            } else {
                // Heuristic: skip mismatches for now or report
            }
        }
    }
});

console.log('Unclosed tags at end:');
stack.forEach(s => {
    if (s.tag === 'div' || s.tag === 'header' || s.tag === 'nav') {
        console.log(`L${s.l_idx}: ${s.line}`);
    }
});
