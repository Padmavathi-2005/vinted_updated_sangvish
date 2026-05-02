import mongoose from 'mongoose';

const messageSchema = mongoose.Schema(
    {
        conversation_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        sender_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'sender_model'
        },
        sender_model: {
            type: String,
            required: true,
            enum: ['User', 'Admin'],
            default: 'User'
        },
        receiver_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'receiver_model'
        },
        receiver_model: {
            type: String,
            required: true,
            enum: ['User', 'Admin'],
            default: 'User'
        },
        message: {
            type: String,
            required: true,
        },
        message_type: {
            type: String,
            enum: ['text', 'image', 'system', 'offer'],
            default: 'text',
        },
        offer_amount: {
            type: Number,
            default: null,
        },
        offer_status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'countered'],
            default: 'pending',
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

export default mongoose.model('Message', messageSchema);
