import mongoose from 'mongoose';

const favoriteSchema = mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
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

// Compound index: one favorite per user per item
favoriteSchema.index({ user_id: 1, item_id: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
