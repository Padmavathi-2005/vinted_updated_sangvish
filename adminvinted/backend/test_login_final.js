(async () => {
    try {
        console.log('Testing login with --preserve-symlinks server...');
        const response = await fetch('http://127.0.0.1:5001/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@gmail.com', password: 'password123' })
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', data);
    } catch (e) {
        console.error('Test failed:', e.message);
    }
})();
