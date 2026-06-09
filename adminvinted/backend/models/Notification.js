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

// Post-save hook to automatically emit socket event
notificationSchema.post('save', async function (doc) {
    if (global.io && doc.user_id) {
        global.io.to(doc.user_id.toString()).emit('new_notification', doc);
    }

    // Forward notification to main backend so it emits to the connected client
    try {
        const mainBackendUrl = process.env.MAIN_BACKEND_URL || 'http://localhost:5004';
        const internalApiUrl = `${mainBackendUrl.replace(/\/api$/, '')}/api/notifications/emit-internal`;

        await fetch(internalApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'vinted_secret_key_123'
            },
            body: JSON.stringify({
                userId: doc.user_id.toString(),
                notification: doc
            })
        });
        console.log(`[Notification Hook] Forwarded notification ${doc._id} to main backend: ${internalApiUrl}`);
    } catch (err) {
        console.error('[Notification Hook] Failed to forward notification to main backend:', err.message);
    }
});

export default mongoose.model('Notification', notificationSchema);
