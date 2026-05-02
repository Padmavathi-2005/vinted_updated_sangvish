import mongoose from 'mongoose';

const reportSchema = mongoose.Schema(
    {
        reporter_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
        },
        reason: {
            type: String,
            required: [true, 'Please add a reason for the report'],
        },
        message: {
            type: String,
            required: [true, 'Please add a detailed message'],
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
            default: 'pending',
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Report', reportSchema);
