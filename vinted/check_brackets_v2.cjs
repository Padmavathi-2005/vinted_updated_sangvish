const fs = require('fs');

function checkBrackets(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let curlyStack = [];
    let parenStack = [];
    let tagStack = [];

    lines.forEach((line, i) => {
        const lineNum = i + 1;
        
        // Remove comments
        const cleanLine = line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');

        for (let j = 0; j < cleanLine.length; j++) {
            const char = cleanLine[j];
            if (char === '{') curlyStack.push({ lineNum, pos: j });
            else if (char === '}') {
                if (curlyStack.length === 0) console.log(`Extra } at L${lineNum}:${j}`);
                else curlyStack.pop();
            }
            else if (char === '(') parenStack.push({ lineNum, pos: j });
            else if (char === ')') {
                if (parenStack.length === 0) console.log(`Extra ) at L${lineNum}:${j}`);
                else parenStack.pop();
            }
        }
    });

    console.log(`Unclosed { : ${curlyStack.length}`);
    curlyStack.forEach(s => console.log(`  L${s.lineNum}:${s.pos}`));
    
    console.log(`Unclosed ( : ${parenStack.length}`);
    parenStack.forEach(s => console.log(`  L${s.lineNum}:${s.pos}`));
}

const target = process.argv[2];
if (!target) {
    console.error('Please provide a file path');
    process.exit(1);
}
checkBrackets(target);
