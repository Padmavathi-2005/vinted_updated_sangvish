const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const connectDB = require('./config/db');
const Currency = require('./models/Currency');

dotenv.config();

const currencies = [
    { name: 'Indian Rupee', code: 'INR', symbol: '₹', exchange_rate: 1, decimal_places: 2, is_active: true, country: 'India' },
    { name: 'US Dollar', code: 'USD', symbol: '$', exchange_rate: 0.012, decimal_places: 2, is_active: true, country: 'USA' },
    { name: 'Euro', code: 'EUR', symbol: '€', exchange_rate: 0.011, decimal_places: 2, is_active: true, country: 'Europe' },
    { name: 'British Pound', code: 'GBP', symbol: '£', exchange_rate: 0.0095, decimal_places: 2, is_active: true, country: 'UK' },
    { name: 'Japanese Yen', code: 'JPY', symbol: '¥', exchange_rate: 1.80, decimal_places: 0, is_active: true, country: 'Japan' },
    { name: 'Australian Dollar', code: 'AUD', symbol: 'A$', exchange_rate: 0.018, decimal_places: 2, is_active: true, country: 'Australia' },
    { name: 'Canadian Dollar', code: 'CAD', symbol: 'C$', exchange_rate: 0.016, decimal_places: 2, is_active: true, country: 'Canada' },
    { name: 'Swiss Franc', code: 'CHF', symbol: 'CHF', exchange_rate: 0.011, decimal_places: 2, is_active: true, country: 'Switzerland' },
    { name: 'Chinese Yuan', code: 'CNY', symbol: '¥', exchange_rate: 0.086, decimal_places: 2, is_active: true, country: 'China' },
    { name: 'Swedish Krona', code: 'SEK', symbol: 'kr', exchange_rate: 0.13, decimal_places: 2, is_active: true, country: 'Sweden' },
    { name: 'New Zealand Dollar', code: 'NZD', symbol: 'NZ$', exchange_rate: 0.020, decimal_places: 2, is_active: true, country: 'New Zealand' },
    { name: 'Mexican Peso', code: 'MXN', symbol: '$', exchange_rate: 0.20, decimal_places: 2, is_active: true, country: 'Mexico' },
    { name: 'Singapore Dollar', code: 'SGD', symbol: 'S$', exchange_rate: 0.016, decimal_places: 2, is_active: true, country: 'Singapore' },
    { name: 'Hong Kong Dollar', code: 'HKD', symbol: 'HK$', exchange_rate: 0.094, decimal_places: 2, is_active: true, country: 'Hong Kong' },
    { name: 'Norwegian Krone', code: 'NOK', symbol: 'kr', exchange_rate: 0.13, decimal_places: 2, is_active: true, country: 'Norway' },
    { name: 'South Korean Won', code: 'KRW', symbol: '₩', exchange_rate: 16.03, decimal_places: 0, is_active: true, country: 'South Korea' },
    { name: 'Turkish Lira', code: 'TRY', symbol: '₺', exchange_rate: 0.38, decimal_places: 2, is_active: true, country: 'Turkey' },
    { name: 'Russian Ruble', code: 'RUB', symbol: '₽', exchange_rate: 1.10, decimal_places: 2, is_active: true, country: 'Russia' },
    { name: 'Brazilian Real', code: 'BRL', symbol: 'R$', exchange_rate: 0.060, decimal_places: 2, is_active: true, country: 'Brazil' },
    { name: 'South African Rand', code: 'ZAR', symbol: 'R', exchange_rate: 0.23, decimal_places: 2, is_active: true, country: 'South Africa' },
    { name: 'Philippine Peso', code: 'PHP', symbol: '₱', exchange_rate: 0.67, decimal_places: 2, is_active: true, country: 'Philippines' },
    { name: 'Malaysian Ringgit', code: 'MYR', symbol: 'RM', exchange_rate: 0.057, decimal_places: 2, is_active: true, country: 'Malaysia' }
];

const seedCurrencies = async () => {
    try {
        await connectDB();

        // Check for existing currencies
        const existing = await Currency.find();
        if (existing.length === 0) {
            console.log('No currencies found, seeding...'.yellow);
            await Currency.insertMany(currencies);
        } else {
            console.log('Currencies already exist. Merging new currencies...'.blue);
            for (let currency of currencies) {
                await Currency.findOneAndUpdate(
                    { code: currency.code },
                    { $set: currency },
                    { upsert: true, new: true }
                );
            }
        }

        console.log('Currencies Seeded Successfully!'.green.inverse);
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`.red.inverse);
        process.exit(1);
    }
};

seedCurrencies();
