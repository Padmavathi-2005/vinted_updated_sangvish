
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
const content = fs.readFileSync(path, 'utf8');

let oB = 0, cB = 0, oP = 0, cP = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') oB++;
    if (content[i] === '}') cB++;
    if (content[i] === '(') oP++;
    if (content[i] === ')') cP++;
}
console.log(`{}: ${oB} / ${cB}`);
console.log(`(): ${oP} / ${cP}`);
