import mongoose from 'mongoose';

const itemViewSchema = mongoose.Schema(
    {
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
        },
        ip_address: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

// Compound index: one entry per IP per item
itemViewSchema.index({ item_id: 1, ip_address: 1 }, { unique: true });

export default mongoose.model('ItemView', itemViewSchema);
