import mongoose from 'mongoose';

const frontendContentSchema = mongoose.Schema(
    {
        section: {
            type: String,
            required: true,
            index: true,
        },
        key: {
            type: String,
            required: true,
            index: true,
        },
        values: {
            type: Map,
            of: String,
            default: {},
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

// Ensure unique section + key
frontendContentSchema.index({ section: 1, key: 1 }, { unique: true });

export default mongoose.model('FrontendContent', frontendContentSchema);
