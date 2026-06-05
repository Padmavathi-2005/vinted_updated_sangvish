const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'req_log.txt');
fs.appendFileSync(logFile, 'Log initialized\n');
