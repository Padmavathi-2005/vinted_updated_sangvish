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
