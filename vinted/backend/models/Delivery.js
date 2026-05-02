import mongoose from 'mongoose';

const deliverySchema = mongoose.Schema({
    name: {
        type: String,
        default: 'Delivery System'
    }
}, { timestamps: true });

export default mongoose.model('Delivery', deliverySchema);
