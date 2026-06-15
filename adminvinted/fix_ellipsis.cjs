const fs = require('fs');
const path = require('path');
const dir = 'g:/vinted-updated/adminvinted/src/locales';

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.json')) {
    const f = path.join(dir, file);
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\"\.\.\.Search (.*?)\"/g, '\"Search $1...\"');
    fs.writeFileSync(f, content);
  }
});
console.log('Done fixing ellipsis');
