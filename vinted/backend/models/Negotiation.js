import mongoose from 'mongoose';

const negotiationSchema = mongoose.Schema(
    {
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
        },
        buyer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        seller_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        agreed_price: {
            type: Number,
            required: true,
        },
        currency_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Currency',
        },
        status: {
            type: String,
            enum: ['active', 'used', 'expired', 'cancelled'],
            default: 'active',
        },
        expires_at: {
            type: Date,
            required: true,
            default: () => new Date(+new Date() + 48 * 60 * 60 * 1000), // Default 48 hours
        },
        conversation_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

// Index for fast lookups during item page load
negotiationSchema.index({ item_id: 1, buyer_id: 1, status: 1 });

export default mongoose.model('Negotiation', negotiationSchema);
