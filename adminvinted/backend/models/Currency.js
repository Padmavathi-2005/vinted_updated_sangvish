import mongoose from 'mongoose';

const currencySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a currency name'],
        },
        code: {
            type: String,
            required: [true, 'Please add a currency code'],
            unique: true,
        },
        symbol: {
            type: String,
            required: [true, 'Please add a currency symbol'],
        },
        symbol_position: {
            type: String,
            enum: ['before', 'after'],
            default: 'before',
        },
        exchange_rate: {
            type: Number,
            default: 1,
        },
        decimal_places: {
            type: Number,
            default: 2,
        },
        thousand_separator: {
            type: String,
            default: ',',
        },
        decimal_separator: {
            type: String,
            default: '.',
        },
        country: {
            type: String,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Currency', currencySchema);
