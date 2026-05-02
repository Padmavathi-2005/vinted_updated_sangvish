import mongoose from 'mongoose';

const withdrawalRequestSchema = mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        amount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending',
        },
        currency: {
            type: String,
            default: 'INR'
        },
        payment_method: {
            type: String, // Bank, UPI, PayPal, etc.
        },
        payment_details: {
            type: Object, // Store snapshot of user payout method details
        },
        payout_method_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserPayoutMethod'
        },
        admin_note: {
            type: String,
        },
        processed_at: {
            type: Date,
        },
        processed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
