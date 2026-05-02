
const fs = require('fs');
const path = 'e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Fix 1022 - insert 3 more closes
lines[1022] = '                </div>\n            </div>\n        </div>\n    </div>\n</div>';

fs.writeFileSync(path, lines.join('\n'));
