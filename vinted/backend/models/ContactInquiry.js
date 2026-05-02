import mongoose from 'mongoose';

const contactInquirySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
        },
        subject: {
            type: String,
            required: [true, 'Please add a subject'],
        },
        message: {
            type: String,
            required: [true, 'Please add a message'],
        },
        status: {
            type: String,
            enum: ['pending', 'read', 'replied', 'resolved'],
            default: 'pending',
        },
        reply_message: {
            type: String,
            default: null,
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('ContactInquiry', contactInquirySchema);
