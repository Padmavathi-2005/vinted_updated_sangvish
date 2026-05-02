
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use a more flexible regex to find the garbage
// It's after the cart link (869) and before the user ternary (876)
const cartClose = /<\/Link>\s*<\/Link>\s*<>\s*<\/>\s*\)}\s*<>\s*<\/>\s*\)}/.test(content.replace(/\s+/g, ' '));
// Wait, the above is too hard.

// I'll just find the lines 869-875 by content and replace them.
const lines = content.split('\n');
// We want to remove lines 870 to 875 and keep 869
// But let's verify line contents first
console.log('Line 869:', lines[868]);
console.log('Line 871:', lines[870]);
console.log('Line 872:', lines[871]);

if (lines[870].trim() === '</Link>' && lines[871].trim() === '</>') {
    lines.splice(870, 5); // remove 871, 872, 873, 874, 875
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Fixed!');
} else {
    console.log('Content mismatch!');
}
