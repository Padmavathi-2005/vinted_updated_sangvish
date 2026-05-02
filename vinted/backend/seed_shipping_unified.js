import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const ShippingCompanySchema = new mongoose.Schema({
    company_name: { type: String, required: true, unique: true },
    tracking_url: { type: String, required: true },
    logo: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const ShippingCompany = mongoose.model('ShippingCompany', ShippingCompanySchema);

const seedShippingCompanies = async () => {
    try {
        console.log('Connecting to MongoDB...');
        // Use standard MONGO_URI from .env
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vinted');
        console.log('Connected.');

        const companies = [
            {
                company_name: 'DHL',
                tracking_url: 'https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=%tracking_id%',
                status: 'active'
            },
            {
                company_name: 'FedEx',
                tracking_url: 'https://www.fedex.com/fedextrack/?trknbr=%tracking_id%',
                status: 'active'
            },
            {
                company_name: 'UPS',
                tracking_url: 'https://www.ups.com/track?loc=en_US&tracknum=%tracking_id%',
                status: 'active'
            },
            {
                company_name: 'USPS',
                tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=%tracking_id%',
                status: 'active'
            }
        ];

        for (const company of companies) {
            await ShippingCompany.findOneAndUpdate(
                { company_name: company.company_name },
                { 
                    ...company,
                    updated_at: new Date()
                },
                { upsert: true, new: true }
            );
            console.log(`Updated/Created: ${company.company_name}`);
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding shipping companies:', error);
        process.exit(1);
    }
};

seedShippingCompanies();
