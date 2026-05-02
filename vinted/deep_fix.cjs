
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix Search focus border & alignment
content = content.replace(
    /border: isSearchFocused \? `2px solid \${settings\.primary_color}` : '2px solid transparent',/g,
    "border: '2px solid transparent',"
);
content = content.replace(
    /boxShadow: isSearchFocused \? `0 0 0 4px \${settings\.primary_color}15` : 'none',/g,
    "boxShadow: 'none',"
);
// Fix Search Input padding/alignment
content = content.replace(
    /padding: '0 12px',/g,
    "padding: '0 16px',"
);

// 2. Fix Search Suggestions query extraction
content = content.replace(
    /const query = item\.query \|\| item\.name;/g,
    "const query = (typeof item === 'string') ? item : (item.name || item.query);"
);

// 3. Robust Div Fixing
const lines = content.split('\n');

// Find end of mobile-toggle block
const toggleEnd = lines.findIndex(l => l.includes('{/* Horizontal Category Bar */}'));
if (toggleEnd !== -1) {
    // We expect 5 closures after mobile-toggle for (toggle, group, right, content, ?)
    // Wait, let's just make it exact based on stack.
    // L1010-1020 area.
    let target = lines.findIndex(l => l.includes('onMouseEnter={() => setShowCategoryBar(true)}'));
    if (target !== -1) {
        // Find the line before this block starts
        let startBlock = lines.findIndex(l => l.includes('{/* Mobile Toggle */}'));
        if (startBlock !== -1) {
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
                '</div>',
                ''
            ];
            // Replace up to the Category Bar comment
            let catBarComm = lines.findIndex(l => l.includes('{/* Horizontal Category Bar */}'));
            if (catBarComm !== -1) {
                lines.splice(startBlock, catBarComm - startBlock, ...replacement);
            }
        }
    }
}

// 4. Fix horizontal-bar-wrapper closures
const catBarEnd = lines.findIndex(l => l.includes('{/* Desktop Mega Menu Dropdown'));
if (catBarEnd !== -1) {
    // Search backwards for the last closures of the category bar
    for (let i = catBarEnd - 1; i > catBarEnd - 10; i--) {
        if (lines[i].includes('</div>') && lines[i + 1].includes(')')) {
            lines[i] = '                </div>\n            </div>';
            break;
        }
    }
}

content = lines.join('\n');

// Final check for </header >
content = content.replace(/<\/header\s*>/g, '</header>');

fs.writeFileSync(path, content);
console.log('Deep fix applied!');
