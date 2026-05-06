import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import ShippingCompany from '../models/ShippingCompany.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedDhl = async () => {
    try {
        await connectDB();
        console.log('Seeding DHL Shipping Company...');

        const dhl = await ShippingCompany.findOne({ company_name: 'DHL Express' });
        if (!dhl) {
            await ShippingCompany.create({
                company_name: 'DHL Express',
                tracking_url: 'https://www.dhl.com/en/express/tracking.html?AWB=%tracking_id%',
                status: 'active'
            });
            console.log('✅ DHL Express added to database.');
        } else {
            console.log('ℹ️ DHL Express already exists.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

seedDhl();
