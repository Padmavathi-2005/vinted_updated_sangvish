import http from 'http';

http.get('http://localhost:5001/api/admin/categories', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data}`);
    });
}).on('error', err => console.error(err));
