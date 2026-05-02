import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    status: {
        type: String,
        enum: ['active', 'unsubscribed'],
        default: 'active',
    },
    source: {
        type: String,
        default: 'footer',
    },
    ip: {
        type: String,
        default: '',
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

export default mongoose.model('Newsletter', newsletterSchema);
