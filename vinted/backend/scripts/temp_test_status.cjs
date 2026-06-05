const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function runTest() {
    try {
        const loginRes = await axios.post('http://localhost:5004/api/auth/login', {
            email: 'admin@gmail.com',
            password: 'password'
        });
    } catch(e) {
        console.error("Status:", e.response ? e.response.status : e.message);
    }
}
runTest();
