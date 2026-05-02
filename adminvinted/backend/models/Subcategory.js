import mongoose from 'mongoose';

// ─── Level 2: Subcategories (e.g. Clothing, Shoes, Bags under Women)
// These appear in the LEFT PANEL of the mega-menu
const subcategorySchema = mongoose.Schema(
    {
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Please add a subcategory name'],
        },
        slug: {
            type: String,
            required: [true, 'Please add a slug'],
        },
        description: { type: String },
        icon: { type: String },
        image: { type: String },
        is_active: { type: Boolean, default: true },
        sort_order: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

// Compound unique: same slug can exist under different categories
subcategorySchema.index({ category_id: 1, slug: 1 }, { unique: true });

export default mongoose.model('Subcategory', subcategorySchema);
