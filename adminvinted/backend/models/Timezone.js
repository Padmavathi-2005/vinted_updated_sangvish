import mongoose from 'mongoose';

const timezoneSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        offset: {
            type: String,
            required: true
        },
        is_active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

export default mongoose.model('Timezone', timezoneSchema);
