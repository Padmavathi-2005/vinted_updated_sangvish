import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('paymentmethods');

        const count = await collection.countDocuments();
        if (count > 0) {
            console.log('Payment methods already exist. Skipping seed.');
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
        console.log('Seed completed successfully via raw connection');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
};

seed();
