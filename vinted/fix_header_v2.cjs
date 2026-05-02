
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('{/* Mobile Toggle */}'));
if (startIndex !== -1) {
    const replacement = [
        '                {/* Mobile Toggle */}',
        '                <div className="mobile-toggle">',
        '                    <button onClick={openMobileMenu} className="hamburger-btn">',
        '                        <FaBars size={24} />',
        '                    </button>',
        '                </div>',
        '            </div>',
        '        </div>',
        '    </div>',
        ''
    ];
    // Use a looser match for the end index
    const endIndex = lines.findIndex((l, idx) => idx > startIndex && l.includes('Horizontal Category Bar'));
    if (endIndex !== -1) {
        lines.splice(startIndex, endIndex - startIndex, ...replacement);
        fs.writeFileSync(path, lines.join('\n'));
        console.log('Header closures fixed!');
    } else {
        console.log('End index not found!');
    }
} else {
    console.log('Start index not found!');
}
