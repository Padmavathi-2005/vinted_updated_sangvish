import mongoose from 'mongoose';

const userPayoutMethodSchema = mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        payout_type: {
            type: String,
            required: true,
            enum: ['Bank', 'UPI', 'PayPal', 'Other'],
            default: 'Bank',
        },
        // Bank specific fields
        bank_name: String,
        account_holder_name: String,
        account_number: String,
        ifsc_code: String,
        branch_name: String,
        branch_city: String,
        branch_address: String,
        country: String,
        
        // UPI specific
        upi_id: String,
        
        // PayPal specific
        paypal_email: String,
        
        // Common
        is_default: {
            type: Boolean,
            default: false,
        },
        note: String,
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('UserPayoutMethod', userPayoutMethodSchema);
