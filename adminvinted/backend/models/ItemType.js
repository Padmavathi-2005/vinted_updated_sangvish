import mongoose from 'mongoose';

// Item Type (Level 3 Category)
// e.g. Dresses, Tops, Jeans under Women > Clothing
const itemTypeSchema = mongoose.Schema(
    {
        subcategory_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subcategory',
            required: true,
        },
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Please add an item type name'],
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

// Compound unique: same slug under same subcategory
itemTypeSchema.index({ subcategory_id: 1, slug: 1 }, { unique: true });

export default mongoose.model('ItemType', itemTypeSchema);
