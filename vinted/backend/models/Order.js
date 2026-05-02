import mongoose from 'mongoose';

const orderSchema = mongoose.Schema(
    {
        order_number: {
            type: String,
            required: [true, 'Please add an order number'],
            unique: true,
        },
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: false, // Optional for bundles where multiple items exist
        },
        items: [{
            item_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Item',
            },
            price: Number,
        }],
        is_bundle: {
            type: Boolean,
            default: false,
        },
        buyer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        seller_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        item_price: {
            type: Number,
            required: true,
        },
        bundle_discount_amount: {
            type: Number,
            default: 0,
        },
        shipping_fee: {
            type: Number,
            default: 0,
        },
        platform_fee: {
            type: Number,
            default: 0,
        },
        total_amount: {
            type: Number,
            required: true,
        },
        payment_method: {
            type: String,
            required: true,
        },
        payment_status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
            default: 'pending',
        },
        order_status: {
            type: String,
            enum: ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'return_requested'],
            default: 'pending',
        },
        shipping_company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ShippingCompany',
        },
        tracking_id: {
            type: String,
        },
        dispatch_date: {
            type: Date,
        },
        stripe_payment_id: {
            type: String,
        },
        shipping_address: {
            full_name: String,
            phone: String,
            address_line: String,
            city: String,
            state: String,
            country: String,
            pincode: String,
        },
        delivered_at: {
            type: Date,
        },
        packed_at: {
            type: Date,
        },
        shipped_at: {
            type: Date,
        },
        out_for_delivery_at: {
            type: Date,
        },
        return_requested_at: {
            type: Date,
        },
        cancelled_at: {
            type: Date,
        },
        return_reason: {
            type: String,
        },
        partial_refund_reason: {
            type: String,
        },
        refund_amount: {
            type: Number,
            default: 0
        },
        cancel_reason: {
            type: String,
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Order', orderSchema);
