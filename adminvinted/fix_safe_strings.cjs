const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src/pages', function(filePath) {
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Safely replace `.toLowerCase()` -> `?.toLowerCase()` and `.toUpperCase()` -> `?.toUpperCase()`
    // We only want to add `?` if it's following a variable access like `obj.prop.toLowerCase()`
    // Regex matches a word boundary, an identifier, and a dot before toLowerCase
    
    // E.g. row.status.toLowerCase() -> row.status?.toLowerCase()
    content = content.replace(/([a-zA-Z0-9_]+)\.(toLowerCase|toUpperCase)\(\)/g, (match, p1, p2) => {
        return `${p1}?.${p2}()`;
    });
    
    // And for string literals or function results we shouldn't add ?. 
    // e.g. "String".toLowerCase() or func().toLowerCase() 
    // The above regex only catches `identifier.toLowerCase()`, not `"abc".toLowerCase()` or `func().toLowerCase()`.
    
    // There might be `row.status?.toLowerCase()` already, which would become `row.status??.toLowerCase()`.
    content = content.replace(/\?\?\./g, '?.');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed', filePath);
    }
});
