
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use a better regex that handles multi-line self-closing tags
function cleanContent(c) {
    // Remove self-closing tags that might span multiple lines
    // This is hard with regex, so let's just target the known ones
    return c.replace(/<div[^>]*\/>/gs, '');
}

// I'll just fix the known notification caret issue
content = content.replace(/<div style=\{\{\s*position: 'absolute', top: '-6px', right: '72px',\s*width: '12px', height: '12px', background: 'white',\s*transform: 'rotate\(45deg\)',\s*borderLeft: '1px solid #e9ecef', borderTop: '1px solid #e9ecef'\s*\}\} \/>/g,
    '<div style={{ position: "absolute", top: "-6px", right: "72px", width: "12px", height: "12px", background: "white", transform: "rotate(45deg)", borderLeft: "1px solid #e9ecef", borderTop: "1px solid #e9ecef" }} />'
);

// I'll also fix the language/currency caret issues if they exist
content = content.replace(/<div style=\{\{\s*position: 'absolute',\s*top: '-6px',\s*left: '50%',\s*width: '12px',\s*height: '12px',\s*background: 'white',\s*transform: 'translateX\(-50%\) rotate\(45deg\)',\s*borderLeft: '1px solid #e9ecef',\s*borderTop: '1px solid #e9ecef'\s*\}\}><\/div>/g,
    '<div style={{ position: "absolute", top: "-6px", left: "50%", width: "12px", height: "12px", background: "white", transform: "translateX(-50%) rotate(45deg)", borderLeft: "1px solid #e9ecef", borderTop: "1px solid #e9ecef" }} />'
);

// Now apply the extra closures at the end of right-section
const lines = content.split('\n');
let midEnd = lines.findIndex(l => l.includes('{/* Horizontal Category Bar */}'));
if (midEnd !== -1) {
    // We want to ensure we have exactly 5 closings before this
    const replacement = [
        '                {/* Mobile Toggle */}',
        '                <div className="mobile-toggle">',
        '                    <button onClick={openMobileMenu} className="hamburger-btn">',
        '                        <FaBars size={24} />',
        '                    </button>',
        '                </div>',
        '            </div>', // close bell wrapper or similar
        '        </div>', // close icon-group
        '    </div>', // close right-section
        '</div>', // close header-content
        ''
    ];
    let midStart = lines.findIndex(l => l.includes('{/* Mobile Toggle */}'));
    if (midStart !== -1) {
        lines.splice(midStart, midEnd - midStart, ...replacement);
    }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Super deep fix applied!');
