import mongoose from 'mongoose';

const userPayoutMethodSchema = mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    payout_type: {
        type: String,
        required: true,
        enum: ['Bank', 'UPI', 'PayPal', 'Other'],
        default: 'Bank'
    },
    // Bank Details
    bank_name: String,
    account_holder_name: String,
    account_number: String,
    ifsc_code: String,
    branch_name: String,
    branch_city: String,
    branch_address: String,
    country: String,
    
    // UPI Details
    upi_id: String,
    
    // PayPal Details
    paypal_email: String,
    
    is_default: {
        type: Boolean,
        default: false
    },
    note: String
}, {
    timestamps: true
});

const UserPayoutMethod = mongoose.model('UserPayoutMethod', userPayoutMethodSchema);

export default UserPayoutMethod;
