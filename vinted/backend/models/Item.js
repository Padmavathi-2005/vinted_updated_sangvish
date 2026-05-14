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
        slug: {
            type: String,
            unique: true,
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
        },
        short_description: {
            type: String,
            default: '',
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
            enum: ['New', 'Very Good', 'Good', 'Normal', 'Bad', 'Very Bad'],
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
        location_label: {
            type: String,
            default: '',
        },
        lat: {
            type: Number,
            default: null,
        },
        lng: {
            type: Number,
            default: null,
        },
        country: {
            type: String,
            default: '',
        },
        state: {
            type: String,
            default: '',
        },
        city: {
            type: String,
            default: '',
        },
        pincode: {
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
            enum: ['active', 'inactive', 'pending', 'deleted', 'available', 'sold'],
            default: 'active',
        },
        is_sold: {
            type: Boolean,
            default: false,
        },
        is_ordered: {
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
        seo_title: {
            type: String,
            default: '',
        },
        seo_description: {
            type: String,
            default: '',
        },
        seo_keywords: {
            type: String,
            default: '',
        },
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
                        // Handle potential object storage {0: 'i', 1: 'm', ...}
                        if (img && typeof img === 'object' && !Array.isArray(img)) {
                            img = Object.values(img).join('');
                        }
                        
                        if (img && typeof img === 'string') {
                            if (img.startsWith('http')) return img;
                            if (img.startsWith('images/')) return img;
                            
                            // Aggressive clean
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

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

itemSchema.pre('save', async function () {
    if (this.isModified('title') || !this.slug) {
        this.slug = `${slugify(this.title)}-${this._id.toString().substring(18)}`;
    }
    if (this.isModified('description') && this.description) {
        let short = this.description;
        if (short.length > 120) {
            short = short.substring(0, 117);
            const lastSpace = short.lastIndexOf(' ');
            if (lastSpace > 80) {
                short = short.substring(0, lastSpace);
            }
            short += '...';
        }
        this.short_description = short;
    }
});

export default mongoose.model('Item', itemSchema);
