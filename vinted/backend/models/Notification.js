import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'on_model',
            required: true,
        },
        on_model: {
            type: String,
            required: true,
            enum: ['User', 'Admin'],
            default: 'User',
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['info', 'message', 'order', 'success', 'error', 'request'],
            default: 'info',
        },
        link: {
            type: String,
        },
        is_read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Notification', notificationSchema);
