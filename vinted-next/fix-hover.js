const fs = require('fs');
const path = require('path');

const cssDir = 'g:/vinted-updated/vinted-next/app/styles';
const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(cssDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find all blocks like: .selector:hover { ... transform: translateY(-5px); ... }
  const regex = /([^\n\{]+):hover\s*\{([^\}]+)transform:\s*translateY\([^\)]+\)[^\}]*\}/g;
  
  let match;
  let addedRules = '';
  const selectorsToFix = new Set();
  
  while ((match = regex.exec(content)) !== null) {
    const rawSelector = match[1].trim();
    const parts = rawSelector.split(',').map(p => p.trim());
    for (let part of parts) {
       part = part.replace(/:hover$/, '').trim();
       if (part && !part.includes('@')) {
         selectorsToFix.add(part);
       }
    }
  }
  
  if (selectorsToFix.size > 0) {
    addedRules += '\n\n/* --- Auto-injected Hit Area Fixes for CSS Hover Jitter --- */\n';
    let fixedInFile = 0;
    for (const sel of selectorsToFix) {
      if (sel.includes('btn') || sel.includes('card') || sel.includes('item') || sel.includes('icon') || sel.includes('wrapper') || sel.includes('link') || sel.includes('tag')) {
         addedRules += sel + ' { position: relative; }\n';
         addedRules += sel + '::after { content: ""; position: absolute; bottom: -10px; left: -5px; right: -5px; height: 10px; z-index: -1; }\n';
         totalFixed++;
         fixedInFile++;
      }
    }
    if (fixedInFile > 0) {
        fs.appendFileSync(filePath, addedRules);
        console.log('Fixed ' + fixedInFile + ' selectors in ' + file);
    }
  }
}

console.log('Total selectors fixed: ' + totalFixed);
