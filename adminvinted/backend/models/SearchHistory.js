import mongoose from 'mongoose';

const searchHistorySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    query: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

// Avoid duplicate searches for the same user, updating the timestamp if it exists
searchHistorySchema.index({ user: 1, query: 1 }, { unique: true });

export default mongoose.model('SearchHistory', searchHistorySchema);
