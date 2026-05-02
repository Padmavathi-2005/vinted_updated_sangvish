import mongoose from 'mongoose';

const conversationSchema = mongoose.Schema(
    {
        participants: [
            {
                _id: false,
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    refPath: 'participants.on_model',
                    required: true,
                },
                on_model: {
                    type: String,
                    required: true,
                    enum: ['User', 'Admin'],
                    default: 'User',
                },
            },
        ],
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
        },
        last_message: {
            type: String,
        },
        last_message_at: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
        },
        initiator_id: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'initiator_model',
            required: true,
        },
        initiator_model: {
            type: String,
            required: true,
            enum: ['User', 'Admin'],
            default: 'User',
        },
        blocked_by: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            }
        ],
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Conversation', conversationSchema);
