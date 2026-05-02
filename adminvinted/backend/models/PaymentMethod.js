import mongoose from 'mongoose';

const paymentMethodSchema = mongoose.Schema(
    {
        name: {
            type: Map,
            of: String,
            default: {},
        },
        key: {
            type: String,
            required: [true, 'Please add a key'],
            unique: true,
        },
        description: {
            type: Map,
            of: String,
            default: {},
        },
        icon: {
            type: String,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        sort_order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('PaymentMethod', paymentMethodSchema);
