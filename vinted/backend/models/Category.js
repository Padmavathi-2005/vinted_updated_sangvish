import mongoose from 'mongoose';

// ─── Level 1: Top-level categories (Women, Men, Designer, Kids, Home, Electronics, Entertainment, Hobbies & Collectibles, Sports)
const categorySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a category name'],
            unique: true,
        },
        slug: {
            type: String,
            required: [true, 'Please add a slug'],
            unique: true,
        },
        description: { type: String },
        icon: { type: String },         // icon class or emoji
        image: { type: String },        // New image field
        is_active: { type: Boolean, default: true },
        sort_order: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

export default mongoose.model('Category', categorySchema);
