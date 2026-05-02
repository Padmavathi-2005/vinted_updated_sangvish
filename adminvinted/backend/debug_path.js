import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
    console.log('Mongoose path:', require.resolve('mongoose'));
} catch (e) {
    console.log('Mongoose not found via require');
}
