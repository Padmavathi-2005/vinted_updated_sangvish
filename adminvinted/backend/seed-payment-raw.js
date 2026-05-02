import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB Raw');
        const db = client.db();
        const collection = db.collection('paymentmethods');

        const count = await collection.countDocuments();
        if (count > 0) {
            console.log('Payment methods already exist in collection. Skipping.');
            process.exit(0);
        }

        const methods = [
            {
                name: {
                    en: 'Stripe',
                    ar: 'سترايب',
                    fr: 'Stripe'
                },
                key: 'stripe',
                description: {
                    en: 'Pay securely with your credit or debit card via Stripe.',
                    ar: 'ادفع بأمان باستخدام بطاقتك الائتمانية عبر سترايب.'
                },
                is_active: true,
                sort_order: 1,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: {
                    en: 'PayPal',
                    ar: 'بايبال',
                    fr: 'PayPal'
                },
                key: 'paypal',
                description: {
                    en: 'Safe and easy payment using your PayPal account.',
                    ar: 'دفع آمن وسهل باستخدام حساب بايبال الخاص بك.'
                },
                is_active: true,
                sort_order: 2,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: {
                    en: 'Wallet',
                    ar: 'المحفظة'
                },
                key: 'wallet',
                description: {
                    en: 'Pay using your internal wallet balance.',
                    ar: 'الدفع باستخدام رصيد محفظتك الداخلية.'
                },
                is_active: true,
                sort_order: 3,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        await collection.insertMany(methods);
        console.log('Raw Seed completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Raw Seed failed:', err);
        process.exit(1);
    } finally {
        await client.close();
    }
};

seed();
