import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import Page from './models/Page.js';

const checkAndSeedPages = async () => {
    await connectDB();

    const existingPages = await Page.find({}, 'title slug');
    console.log('Existing pages:');
    existingPages.forEach(p => console.log(' -', p.slug, '|', p.title));

    const requiredSlugs = [
        'help-center',
        'shipping-info',
        'returns-refunds',
        'item-verification',
        'safety-center',
        'privacy-policy',
        'terms-of-service',
        'cookie-settings',
    ];

    const existingSlugs = existingPages.map(p => p.slug);
    const missing = requiredSlugs.filter(s => !existingSlugs.includes(s));
    console.log('\nMissing pages:', missing);

    process.exit(0);
};

checkAndSeedPages().catch(e => { console.error(e.message); process.exit(1); });
