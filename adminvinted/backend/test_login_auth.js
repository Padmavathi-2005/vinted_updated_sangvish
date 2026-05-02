(async () => {
    try {
        console.log('Logging in...');
        const loginRes = await fetch('http://127.0.0.1:5001/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@gmail.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Token received:', !!token);

        console.log('\nFetching dashboard exactly like interceptor respects...');
        try {
            const dashRes = await fetch('http://127.0.0.1:5001/api/admin/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dashData = await dashRes.json();
            console.log('Dashboard Data keys:', Object.keys(dashData));
        } catch (dashErr) {
            console.error('Dashboard Error:', dashErr.message);
        }

        console.log('\nFetching languages...');
        try {
            const langRes = await fetch('http://127.0.0.1:5001/api/admin/languages', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const langData = await langRes.json();
            console.log('Languages response:', langData.length !== undefined ? langData.length : langData);
        } catch (langErr) {
            console.error('Languages Error:', langErr.message);
        }

    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
})();
