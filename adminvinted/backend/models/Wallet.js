import mongoose from 'mongoose';

const walletSchema = mongoose.Schema(
    {
        owner_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'owner_type',
        },
        owner_type: {
            type: String,
            required: true,
            enum: ['User', 'Admin', 'Delivery'],
        },
        balance: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: 'INR',
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Wallet', walletSchema);
