const fs = require('fs');

function checkTags(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let stack = [];

    lines.forEach((line, i) => {
        const lineNum = i + 1;
        let temp = line;

        // Remove self-closing tags
        temp = temp.replace(/<[a-zA-Z0-9]+[^>]*\/>/g, '');
        
        // Find opening tags
        const opens = temp.matchAll(/<([a-zA-Z0-9]+)(\s|>)/g);
        for (const match of opens) {
            const tag = match[1];
            if (['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag)) continue;
            stack.push({ lineNum, tag });
        }

        // Find closing tags
        const closes = temp.matchAll(/<\/([a-zA-Z0-9]+)>/g);
        for (const match of closes) {
            const tag = match[1];
            if (stack.length === 0) {
                console.log(`Extra closing tag </${tag}> at L${lineNum}`);
            } else {
                const last = stack.pop();
                if (last.tag !== tag) {
                    console.log(`Mismatch: Expected </${last.tag}> (from L${last.lineNum}), but found </${tag}> at L${lineNum}`);
                }
            }
        }
    });

    console.log(`Remaining unclosed tags: ${stack.length}`);
    stack.forEach(s => console.log(`  L${s.lineNum}: <${s.tag}>`));
}

checkTags(process.argv[2]);
