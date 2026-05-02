
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
let content = fs.readFileSync(path, 'utf8');

// I'll basically use a regex to find the right-section ending and replace it with a clean version
// And search for unclosed header and fix it.

// 1. Fix the top row closures
const rightSectionRegex = /<div\s+className="right-section">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
// Wait, I suspect I have too many divs now.

// I'll just search for the specific lines I know I messed up.
content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '</div>\n            </div>\n        </div>');
// That's for the 1020-1027 block.

content = content.replace(/<\/header\s*>/g, '</header>');

fs.writeFileSync(path, content);
