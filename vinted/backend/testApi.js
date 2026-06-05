import axios from 'axios';

const test = async () => {
    try {
        const req = axios.create({ baseURL: 'http://localhost:5000' });
        // Assuming admin login is needed
        const login = await req.post('/api/admin/login', { email: 'admin@vinted.com', password: 'password123' });
        const token = login.data.token;
        req.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Create category
        console.log('Creating category...');
        const res1 = await req.post('/api/admin/categories', { name: 'TestCat', slug: 'test-cat', description: 'test' });
        console.log('Created:', res1.data);
        const catId = res1.data._id;

        // Edit category
        console.log('Editing category...');
        const res2 = await req.put(`/api/admin/categories/${catId}`, { name: 'TestCatEdited', slug: 'test-cat' });
        console.log('Edited:', res2.data);

        // Delete category
        console.log('Deleting category...');
        const res3 = await req.delete(`/api/admin/categories/${catId}`);
        console.log('Deleted:', res3.data);

    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
};

test();
