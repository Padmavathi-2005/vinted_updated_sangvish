const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const FormData = require('form-data');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const token = jwt.sign({ id: '64f8a9123456789012345678', role: 'admin' }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1h' });

async function testPut() {
    try {
        const form = new FormData();
        form.append('google_enabled', 'true');

        const putRes = await axios.put('http://localhost:5004/api/settings/social_login_settings', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Status:", putRes.status);
    } catch(e) {
        if (e.response) {
            console.log("Response:", e.response.status, e.response.data);
        } else if (e.request) {
            console.log("No response received. The backend process might have crashed or hung.");
            console.log("Error code:", e.code);
        } else {
            console.log("Error:", e.message);
        }
    }
}
testPut();
