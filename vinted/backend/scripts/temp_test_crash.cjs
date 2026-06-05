const { spawn } = require('child_process');
const fs = require('fs');

const logStream = fs.createWriteStream('g:/vinted-updated/vinted/backend/crash_log.txt');
const backend = spawn('node', ['server.js'], { cwd: 'g:/vinted-updated/vinted/backend' });

backend.stdout.pipe(logStream);
backend.stderr.pipe(logStream);

setTimeout(() => {
    // Send PUT request while monitoring
    const axios = require('axios');
    const jwt = require('jsonwebtoken');
    const dotenv = require('dotenv');
    dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });
    const token = jwt.sign({ id: '64f8a9123456789012345678', role: 'admin' }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1h' });

    axios.put('http://localhost:5004/api/settings/social_login_settings', {
        google_client_id: 'local-test-id'
    }, {
        headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
}, 3000);

setTimeout(() => {
    backend.kill();
    console.log("Done");
    process.exit(0);
}, 6000);
