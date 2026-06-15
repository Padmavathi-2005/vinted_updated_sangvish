import axios from 'axios';
import https from 'https';

async function testApi() {
    const api = axios.create({
        baseURL: 'http://localhost:5004/api', // Adjust if needed
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    try {
        const loginRes = await api.post('/users/login', {
            email: 'buyer@email.com',
            password: '12345678'
        });
        
        const token = loginRes.data.token;
        const ordersRes = await api.get('/orders', {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 10 }
        });
        
        const { bought } = ordersRes.data;
        if (bought.length > 0) {
            bought.forEach(b => console.log(b._id, b.order_status));
        }
        
    } catch (err) {
        console.error("API Error:", err.message);
    }
}

testApi();
