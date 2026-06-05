const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function runTest() {
    try {
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
        
        // 3. Put new settings with formData
        const FormData = require('form-data');
        const form = new FormData();
        form.append('google_client_id', 'testing-via-axios.apps.googleusercontent.com');
        
        // Also simulate what frontend does
        form.append('google_enabled', 'true');
        
        const putRes = await axios.put('http://localhost:5004/api/settings/social_login_settings', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: Bearer 
            }
        });
        console.log("Put status:", putRes.status);
        
        // 4. Check again
        const getRes2 = await axios.get('http://localhost:5004/api/settings/social_login_settings');
        console.log("New google_client_id:", getRes2.data.google_client_id);
        
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
runTest();
