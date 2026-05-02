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

export default mongoose.model('Favorite', favoriteSchema);
