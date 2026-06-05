import mongoose from 'mongoose';

const shippingCompanySchema = mongoose.Schema(
    {
        company_name: {
            type: String,
            required: [true, 'Please add a company name'],
            unique: true,
        },
        tracking_url: {
            type: String,
            required: [true, 'Please add a tracking URL format'],
        },
        logo: {
            type: String,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        base_rate: {
            type: Number,
            default: 50,
        },
        per_km_rate: {
            type: Number,
            default: 1.5,
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('ShippingCompany', shippingCompanySchema);
