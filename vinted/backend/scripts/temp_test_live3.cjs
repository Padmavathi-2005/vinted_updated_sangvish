const axios = require('axios');

async function runLiveTest() {
    try {
        console.log("Login to live server...");
        const loginRes = await axios.post('https://vinted.sangvish.com/api/users/login', {
            email: 'admin@gmail.com',
            password: '12345678'
        });
        const token = loginRes.data.token;
        console.log("Got token!", token.substring(0, 15));
        
        const getRes = await axios.get('https://vinted.sangvish.com/api/settings/social_login_settings');
        console.log("Live Client ID before:", getRes.data.google_client_id);
        
        // Put new settings: explicitly setting it to empty string like the user said!
        console.log("Sending google_client_id: '' to backend...");
        const putRes = await axios.put('https://vinted.sangvish.com/api/settings/social_login_settings', {
            google_client_id: '',
            google_enabled: true
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Put status:", putRes.status);
        
        const getRes2 = await axios.get('https://vinted.sangvish.com/api/settings/social_login_settings');
        console.log("Live Client ID after:", getRes2.data.google_client_id);
    } catch(e) {
        console.error("Error:", e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
    }
}
runLiveTest();
