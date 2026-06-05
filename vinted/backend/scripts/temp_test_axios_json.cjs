const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function runTest() {
    try {
        console.log("Starting test...");
        // 1. Login to get token
        const loginRes = await axios.post('http://localhost:5004/api/auth/login', {
            email: 'admin@gmail.com',
            password: 'password'
        });
        const token = loginRes.data.token;
        console.log("Got token:", token.substring(0, 10) + "...");
        
        // 2. Fetch current settings
        const getRes = await axios.get('http://localhost:5004/api/settings/social_login_settings');
        console.log("Current google_client_id:", getRes.data.google_client_id);
        
        // 3. Put new settings with JSON
        const putRes = await axios.put('http://localhost:5004/api/settings/social_login_settings', {
            google_client_id: 'testing-via-json.apps.googleusercontent.com',
            google_enabled: true
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Put status:", putRes.status);
        
        // 4. Check again
        const getRes2 = await axios.get('http://localhost:5004/api/settings/social_login_settings');
        console.log("New google_client_id:", getRes2.data.google_client_id);
        process.exit(0);
    } catch(e) {
        console.error("Error:", e.response ? e.response.data : e.message);
        process.exit(1);
    }
}
runTest();
