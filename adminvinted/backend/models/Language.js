import mongoose from 'mongoose';

const languageSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a language name'],
        },
        code: {
            type: String,
            required: [true, 'Please add a language code'],
            unique: true,
        },
        native_name: {
            type: String,
        },
        direction: {
            type: String,
            enum: ['ltr', 'rtl'],
            default: 'ltr',
        },
        flag: {
            type: String,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Language', languageSchema);
