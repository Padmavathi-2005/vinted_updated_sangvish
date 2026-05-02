import mongoose1 from 'mongoose';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('Admin path:', require.resolve('./models/Admin.js'));
console.log('Mongoose path 1:', require.resolve('mongoose'));

import('./models/Admin.js').then((module) => {
    const Admin = module.default;
    console.log('Admin db:', Admin.db.host);
});

process.exit(0);
