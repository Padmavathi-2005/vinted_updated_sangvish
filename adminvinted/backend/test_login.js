(async () => {
    try {
        const loginRes = await fetch('http://127.0.0.1:5001/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@gmail.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        console.log(loginData);
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
})();
