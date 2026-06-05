const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const token = jwt.sign({ id: '64f8a9123456789012345678', role: 'admin' }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1h' });

async function testPut() {
    try {
        const putRes = await axios.put('http://localhost:5004/api/settings/social_login_settings', {
            google_client_id: 'local-test-id'
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Status:", putRes.status);
    } catch(e) {
        console.error(e.response ? "Response: " + e.response.status : "Error message: " + e.message);
    }
}
testPut();
