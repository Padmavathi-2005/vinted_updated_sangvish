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
        image: {
            type: String,
            default: null,
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

// Post-save hook to automatically emit socket event
notificationSchema.post('save', function (doc) {
    if (global.io && doc.user_id) {
        global.io.to(doc.user_id.toString()).emit('new_notification', doc);
    }
});

export default mongoose.model('Notification', notificationSchema);
