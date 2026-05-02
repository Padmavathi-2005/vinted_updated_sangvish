const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const PaymentMethod = require('./models/PaymentMethod');
const connectDB = require('./config/db');

const seedPaymentMethods = async () => {
    try {
        await connectDB();

        // Clear existing
        await PaymentMethod.deleteMany();

        const methods = [
            {
                name: 'Credit / Debit Card (Stripe)',
                key: 'stripe',
                description: 'Secure payment via Credit or Debit card',
                icon: '💳',
                is_active: true,
                sort_order: 1
            },
            {
                name: 'UPI',
                key: 'upi',
                description: 'Payment via UPI apps',
                icon: '📱',
                is_active: true,
                sort_order: 2
            },
            {
                name: 'Cash on Delivery',
                key: 'cod',
                description: 'Pay when you receive the item',
                icon: '💵',
                is_active: true,
                sort_order: 3
            }
        ];

        await PaymentMethod.insertMany(methods);
        console.log('Payment methods seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding payment methods:', error.message);
        process.exit(1);
    }
};

seedPaymentMethods();
