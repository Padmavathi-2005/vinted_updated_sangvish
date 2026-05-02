import mongoose from 'mongoose';

const itemSchema = mongoose.Schema(
    {
        seller_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Please add a title'],
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
        },
        brand: {
            type: String,
        },
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        subcategory_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subcategory',
            required: true,
        },
        sub_subcategory_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubSubcategory',
        },
        item_type_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ItemType',
        },
        size: {
            type: String,
        },
        color: {
            type: String,
        },
        condition: {
            type: String,
            required: [true, 'Please add item condition'],
            enum: ['New', 'Very Good', 'Good', 'Normal', 'Bad', 'Very Bad', 'new-with-tags', 'new-without-tags', 'very-good', 'good', 'satisfactory', 'poor'],
        },
        price: {
            type: Number,
            required: [true, 'Please add a price'],
        },
        currency_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Currency',
            required: true,
        },
        negotiable: {
            type: Boolean,
            default: false,
        },
        shipping_included: {
            type: Boolean,
            default: false,
        },
        location: {
            type: String,
            default: '',
        },
        images: [
            {
                type: String,
            },
        ],
        likes_count: {
            type: Number,
            default: 0,
        },
        views_count: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'pending', 'deleted'],
            default: 'active',
        },
        is_sold: {
            type: Boolean,
            default: false,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
        original_price: {
            type: Number,
            default: 0,
        },
        discount_prompt_sent: {
            type: Boolean,
            default: false,
        },
        attributes: [
            {
                key: { type: String, required: true },
                value: { type: String, required: true }
            }
        ],
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
        toJSON: {
            transform: function (doc, ret) {
                // Calculate percentage discount if original price exists
                if (ret.original_price && ret.original_price > ret.price) {
                    ret.percentage_off = Math.round(((ret.original_price - ret.price) / ret.original_price) * 100);
                } else {
                    ret.percentage_off = 0;
                }

                if (ret.images && Array.isArray(ret.images)) {
                    ret.images = ret.images.map(img => {
                        if (img && typeof img === 'string' && !img.startsWith('http')) {
                            // Unified aggressive normalization
                            let clean = img.replace(/\\/g, '/').replace(/^\/+/, '');
                            // Strip away any possible nested paths to get just the filename
                            const parts = clean.split('/');
                            const filename = parts[parts.length - 1];
                            return `images/items/${filename}`;
                        }
                        return img;
                    });
                }
                return ret;
            }
        },
        toObject: {
            transform: function (doc, ret) {
                if (ret.original_price && ret.original_price > ret.price) {
                    ret.percentage_off = Math.round(((ret.original_price - ret.price) / ret.original_price) * 100);
                } else {
                    ret.percentage_off = 0;
                }

                if (ret.images && Array.isArray(ret.images)) {
                    ret.images = ret.images.map(img => {
                        if (img && typeof img === 'string' && !img.startsWith('http')) {
                            let clean = img.replace(/\\/g, '/').replace(/^\/+/, '');
                            const parts = clean.split('/');
                            const filename = parts[parts.length - 1];
                            return `images/items/${filename}`;
                        }
                        return img;
                    });
                }
                return ret;
            }
        }
    }
);

export default mongoose.model('Item', itemSchema);
