const axios = require('axios');

async function testGet() {
    try {
        const getRes = await axios.get('http://localhost:5004/api/settings/social_login_settings');
        console.log("Data:", JSON.stringify(getRes.data, null, 2));
    } catch(e) {
        console.error("Error:", e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
    }
}
testGet();
