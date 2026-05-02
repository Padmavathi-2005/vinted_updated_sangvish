import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FrontendContent from './models/FrontendContent.js';

dotenv.config();

const seedNewFields = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const fields = [
            { section: 'home', key: 'hero_badge', defaultValue: 'LOCAL CLASSIFIEDS MARKETPLACE' },
            { section: 'home', key: 'stat_rating_value', defaultValue: '4.8/5' },
            { section: 'home', key: 'stat_rating_label', defaultValue: 'User Trust Rating' },
            { section: 'home', key: 'stat_sellers_value', defaultValue: '5M+' },
            { section: 'home', key: 'stat_sellers_label', defaultValue: 'Happy Sellers' }
        ];

        for (const field of fields) {
            const exists = await FrontendContent.findOne({ section: field.section, key: field.key });
            if (!exists) {
                await FrontendContent.create({
                    section: field.section,
                    key: field.key,
                    values: { en: field.defaultValue }
                });
                console.log(`Created field: ${field.section}.${field.key}`);
            }
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedNewFields();
