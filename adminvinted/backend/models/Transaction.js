import mongoose from 'mongoose';

const transactionSchema = mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'user_type',
        },
        user_type: {
            type: String,
            required: true,
            enum: ['User', 'Admin', 'Delivery'],
        },
        wallet_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Wallet',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },
        purpose: {
            type: String,
            enum: ['sale_earning', 'commission', 'withdrawal', 'refund', 'payment', 'delivery_fee', 'order_refund', 'return_refund_deduction', 'return_refund'],
            required: true,
        },
        reference_id: {
            type: mongoose.Schema.Types.ObjectId,
            // Can refer to Order, WithdrawalRequest, etc.
        },
        reference_model: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'completed',
        },
        description: {
            type: String,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Transaction', transactionSchema);
