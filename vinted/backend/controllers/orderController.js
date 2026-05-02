import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Item from '../models/Item.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Admin from '../models/Admin.js';
import sendEmail from '../utils/sendEmail.js';
import { processOrderPaymentSplit, reverseOrderPayment, processRefundSplit, deductBuyerWallet } from './walletController.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    console.log('CREATE ORDER REQUEST:', req.body);
    const { items, payment_method, paymentMethod, shipping_address, stripe_payment_id } = req.body;
    const actualPaymentMethod = payment_method || paymentMethod || 'card';

    if (!items || items.length === 0) {
        res.status(400);
        throw new Error('No items in order');
    }

    const createdOrders = [];

    // Group items by seller_id to handle bundles
    const sellerGroups = {};
    for (const cartItem of items) {
        const item = await Item.findById(cartItem._id).populate('seller_id');
        if (!item) continue;

        if (item.is_sold || item.status === 'sold') {
            console.warn(`Attempted purchase of sold item: ${item._id}`);
            continue;
        }

        const sellerId = item.seller_id?._id?.toString() || item.seller_id?.toString();
        if (!sellerGroups[sellerId]) {
            sellerGroups[sellerId] = {
                items: [],
                seller: item.seller_id
            };
        }
        sellerGroups[sellerId].items.push(item);
    }

    // 1. Calculate Grand Total and Create Order Plans
    let grandTotal = 0;
    const orderPlans = [];

    for (const sellerId in sellerGroups) {
        const group = sellerGroups[sellerId];
        const groupItems = group.items;
        const seller = group.seller;

        // Calculate Totals
        const itemPriceSum = groupItems.reduce((sum, i) => sum + i.price, 0);

        // Calculate Bundle Discount
        let discountAmount = 0;
        if (seller.bundle_discounts?.enabled) {
            const count = groupItems.length;
            let percentage = 0;
            if (count >= 5) percentage = seller.bundle_discounts.five_items;
            else if (count >= 3) percentage = seller.bundle_discounts.three_items;
            else if (count >= 2) percentage = seller.bundle_discounts.two_items;

            if (percentage > 0) {
                discountAmount = Math.round((itemPriceSum * percentage) / 100);
            }
        }

        // Calculate Combined Shipping (200 INR per seller if not free)
        const anyFreeShipping = groupItems.some(i => i.shipping_included);
        const shippingFee = anyFreeShipping ? 0 : 200;

        const discountedItemPrice = itemPriceSum - discountAmount;
        const totalAmount = discountedItemPrice + shippingFee;

        grandTotal += totalAmount;
        orderPlans.push({
            sellerId,
            groupItems,
            seller,
            itemPriceSum,
            discountAmount,
            shippingFee,
            totalAmount,
            discountedItemPrice
        });
    }

    // 2. Debit Buyer Wallet if needed
    if (actualPaymentMethod === 'wallet') {
        const dummyOrderIds = orderPlans.map((_, i) => `WLT-${Date.now()}-${i}`);
        // This will throw error if insufficient balance
        await deductBuyerWallet(req.user._id, grandTotal, dummyOrderIds);
    }

    // 3. Create actual Orders and Split Profits
    for (const plan of orderPlans) {
        const { sellerId, groupItems, seller, itemPriceSum, discountAmount, shippingFee, totalAmount, discountedItemPrice } = plan;
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const order = await Order.create({
            order_number: orderNumber,
            item_id: groupItems[0]._id, 
            items: groupItems.map(i => ({ item_id: i._id, price: i.price })),
            is_bundle: groupItems.length > 1,
            buyer_id: req.user._id,
            seller_id: sellerId,
            item_price: itemPriceSum,
            bundle_discount_amount: discountAmount,
            shipping_fee: shippingFee,
            total_amount: totalAmount,
            payment_method: actualPaymentMethod,
            payment_status: 'paid', // Wallet was already debited or Stripe was successful
            order_status: 'confirmed',
            shipping_address,
            stripe_payment_id
        });

        // Split Profits (Admin Commission 2%, rest to Seller, 200 to Delivery)
        // Using the same 200 fixed fee consistent with the rest of the app
        const { adminCommission } = await processOrderPaymentSplit({
            seller_id: sellerId,
            item_price: discountedItemPrice,
            shipping_fee: shippingFee,
            order_id: order._id
        });

        order.platform_fee = adminCommission;
        await order.save();

        // Mark items as sold
        for (const item of groupItems) {
            item.status = 'sold';
            item.is_sold = true;
            await item.save();
        }

        // 4. Notifications
        await Notification.create({
            user_id: sellerId,
            on_model: 'User',
            title: groupItems.length > 1 ? 'New Bundle Order!' : 'New Order Received!',
            message: groupItems.length > 1
                ? `You sold a bundle of ${groupItems.length} items. Order ID: #${orderNumber}`
                : `Your item "${groupItems[0].title}" has been booked. Order ID: #${orderNumber}`,
            type: 'order',
            link: `/profile?tab=orders`
        });

        // Send Order Confirmation to Buyer
        try {
            await sendEmail({
                email: req.user.email,
                subject: `Order Confirmation #${orderNumber}`,
                message: `Your order #${orderNumber} has been successfully placed!`,
                html: `<p>Hi ${req.user.username},</p><p>Thank you for your purchase! Your order <b>#${orderNumber}</b> for ${groupItems.length > 1 ? groupItems.length + ' items' : '"' + groupItems[0].title + '"'} has been confirmed.</p><p>You will be notified once it ships.</p>`
            });
        } catch(e) { console.error('Buyer confirmation email failed:', e); }

        // Send New Sale Notification to Seller
        try {
            await sendEmail({
                email: seller.email,
                subject: `New Sale! Order #${orderNumber}`,
                message: `You just sold an item! Order #${orderNumber}`,
                html: `<p>Hi ${seller.username},</p><p>Great news! You just sold ${groupItems.length > 1 ? 'a bundle of ' + groupItems.length + ' items' : '"' + groupItems[0].title + '"'}.</p><p>Please prepare Order <b>#${orderNumber}</b> for shipping.</p>`
            });
        } catch(e) { console.error('Seller sale email failed:', e); }

        // System Message in Conversation
        try {
            let conversation = await Conversation.findOne({
                participants: { 
                    $all: [
                        { $elemMatch: { user: req.user._id, on_model: 'User' } },
                        { $elemMatch: { user: sellerId, on_model: 'User' } }
                    ]
                },
                item_id: groupItems[0]._id
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [
                        { user: req.user._id, on_model: 'User' },
                        { user: sellerId, on_model: 'User' }
                    ],
                    item_id: groupItems[0]._id,
                    initiator_id: req.user._id,
                    status: 'accepted'
                });
            }

            const systemMetadata = JSON.stringify({
                type: 'order_placed',
                item_title: groupItems.length > 1 ? `Bundle of ${groupItems.length} items` : groupItems[0].title,
                order_id: orderNumber,
                item_price: itemPriceSum,
                discount: discountAmount,
                shipping_fee: shippingFee,
                total_amount: totalAmount,
                payment_method: actualPaymentMethod
            });

            await Message.create({
                conversation_id: conversation._id,
                sender_id: req.user._id,
                receiver_id: sellerId,
                message: `ORDER_NOTIFICATION::${systemMetadata}`,
                message_type: 'system'
            });

            conversation.last_message = `🛒 Order placed: ${orderNumber}`;
            conversation.last_message_at = Date.now();
            await conversation.save();

            if (req.io) {
                req.io.to(conversation._id.toString()).emit('receive_message', { conversation });
            }
        } catch (msgErr) {
            console.error("Error sending system message:", msgErr);
        }

        createdOrders.push(order);
    }

    res.status(201).json(createdOrders);
});

// @desc    Get user orders (Bought and Sold)
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const bought = await Order.find({ buyer_id: req.user._id })
        .populate('item_id', 'title images')
        .populate('seller_id', 'username')
        .populate('shipping_company_id')
        .sort({ created_at: -1 });

    const sold = await Order.find({ seller_id: req.user._id })
        .populate('item_id', 'title images')
        .populate('buyer_id', 'username')
        .populate('shipping_company_id')
        .sort({ created_at: -1 });

    console.log(`FETCH ORDERS FOR USER: ${req.user._id}, Bought: ${bought.length}, Sold: ${sold.length}`);
    res.json({ bought, sold });
});

// @desc    Update order shipping address
// @route   PUT /api/orders/:id/address
// @access  Private
const updateOrderAddress = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only buyer can update the address
    if (order.buyer_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to update this order');
    }

    // Only allow update if order is not yet shipped/out_for_delivery/delivered
    if (['shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'return_requested'].includes(order.order_status)) {
        res.status(400);
        throw new Error('Cannot update address for an order that is already in transit or completed');
    }

    order.shipping_address = req.body.shipping_address;
    const updatedOrder = await order.save();

    res.json(updatedOrder);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only seller or admin can update status
    if (order.seller_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to update this order status');
    }    const prevStatus = order.order_status;
    
    // Status Guard: Cannot update if already reached terminal state
    if (['delivered', 'cancelled', 'returned'].includes(prevStatus)) {
        res.status(400);
        throw new Error(`Cannot update order status from ${prevStatus}`);
    }

    order.order_status = status;
    
    // Handle Cancellation Reason if provided
    if (status === 'cancelled' && req.body.cancel_reason) {
        order.cancel_reason = req.body.cancel_reason;
    }

    const updatedOrder = await order.save();

    // Populate for notifications
    const populatedOrder = await Order.findById(order._id).populate('item_id', 'title').populate('buyer_id', 'username email');

    // Notify buyer on status changes
    if (status === 'shipped' || status === 'dispatched') {
        await Notification.create({
            user_id: order.buyer_id,
            on_model: 'User',
            title: 'Order Shipped!',
            message: `Your order "${populatedOrder.item_id?.title}" (#${order.order_number}) has been shipped.`,
            type: 'order',
            link: '/profile?tab=orders'
        });

        try {
            await sendEmail({
                email: populatedOrder.buyer_id.email,
                subject: `Your Order #${order.order_number} has shipped!`,
                message: `Your order "${populatedOrder.item_id?.title}" is on its way.`,
                html: `<p>Hi ${populatedOrder.buyer_id.username},</p><p>Good news! Your order <b>#${order.order_number}</b> for "${populatedOrder.item_id?.title}" has been shipped by the seller.</p>`
            });
        } catch(e) { console.error('Shipped email failed', e); }
    } else if (status === 'out_for_delivery' || status === 'on_the_way') {
        await Notification.create({
            user_id: order.buyer_id,
            on_model: 'User',
            title: 'Order Out for Delivery!',
            message: `Your order "${populatedOrder.item_id?.title}" (#${order.order_number}) is out for delivery.`,
            type: 'order',
            link: '/profile?tab=orders'
        });
    } else if (status === 'delivered') {
        const title = 'Order Delivered! ⭐';
        const message = `Your order "${populatedOrder.item_id?.title}" (#${order.order_number}) has been delivered! Please rate the seller and share your experience.`;
        
        await Notification.create({
            user_id: order.buyer_id,
            on_model: 'User',
            title,
            message,
            type: 'order',
            link: '/profile?tab=orders'
        });

        try {
            await sendEmail({
                email: populatedOrder.buyer_id.email,
                subject: `Your Order #${order.order_number} has been delivered!`,
                message: `Your order "${populatedOrder.item_id?.title}" has been delivered.`,
                html: `<p>Hi ${populatedOrder.buyer_id.username},</p><p>Your order <b>#${order.order_number}</b> for "${populatedOrder.item_id?.title}" has been delivered! Please log in to your account to confirm everything is okay and leave a review for the seller.</p>`
            });
        } catch(e) { console.error('Delivered email failed', e); }

        // Cascade timestamps: If we reached a later stage, fill in previous stages if null
        if (status === 'delivered') {
            if (!order.delivered_at) order.delivered_at = new Date();
            if (!order.out_for_delivery_at) order.out_for_delivery_at = new Date();
            if (!order.shipped_at) order.shipped_at = new Date();
            if (!order.packed_at) order.packed_at = new Date();
        } else if (status === 'out_for_delivery') {
            if (!order.out_for_delivery_at) order.out_for_delivery_at = new Date();
            if (!order.shipped_at) order.shipped_at = new Date();
            if (!order.packed_at) order.packed_at = new Date();
        } else if (status === 'shipped') {
            if (!order.shipped_at) order.shipped_at = new Date();
            if (!order.packed_at) order.packed_at = new Date();
        } else if (status === 'packed') {
            if (!order.packed_at) order.packed_at = new Date();
        }
        
        await order.save();

        // Also send system message in conversation
        try {
            const conversation = await Conversation.findOne({
                participants: { 
                    $all: [
                        { $elemMatch: { user: order.buyer_id, on_model: 'User' } },
                        { $elemMatch: { user: order.seller_id, on_model: 'User' } }
                    ]
                },
            });
            if (conversation) {
                const deliveryMeta = JSON.stringify({
                    type: 'order_delivered',
                    item_title: populatedOrder.item_id?.title,
                    order_id: order.order_number,
                });
                const newMessage = await Message.create({
                    conversation_id: conversation._id,
                    sender_id: order.seller_id,
                    receiver_id: order.buyer_id,
                    message: `ORDER_NOTIFICATION::${deliveryMeta}`,
                    message_type: 'system'
                });
                conversation.last_message = `✅ Order delivered: "${populatedOrder.item_id?.title}"`;
                conversation.last_message_at = Date.now();
                await conversation.save();

                // Emit to socket for immediate reflection
                if (req.io) {
                    req.io.to(conversation._id.toString()).emit('receive_message', {
                        message: newMessage,
                        conversation: conversation
                    });
                }
            }
        } catch (err) {
            console.error('Error sending delivery message:', err);
        }
    }

    // If order is cancelled, trigger wallet reversal and notify buyer
    if (status === 'cancelled' && prevStatus !== 'cancelled') {
        await reverseOrderPayment(order._id);

        // Also mark item as available again
        for (const item of (order.is_bundle ? order.items : [{ item_id: order.item_id }])) {
            await Item.findByIdAndUpdate(item.item_id, { status: 'available', is_sold: false });
        }

        // Notify Buyer
        await Notification.create({
            user_id: order.buyer_id,
            on_model: 'User',
            title: 'Order Cancelled by Seller',
            message: `Your order "${populatedOrder.item_id?.title}" (#${order.order_number}) has been cancelled by the seller. Reason: ${order.cancel_reason || 'N/A'}. A full refund has been processed.`,
            type: 'alert',
            link: '/profile?tab=orders'
        });

        try {
            await sendEmail({
                email: populatedOrder.buyer_id.email,
                subject: `Order Cancelled: #${order.order_number}`,
                message: `Your order was cancelled by the seller.`,
                html: `<p>Hi ${populatedOrder.buyer_id.username},</p><p>Unfortunately, the seller has cancelled your order <b>#${order.order_number}</b>.</p><p>Reason: ${order.cancel_reason || 'N/A'}</p><p>A full refund has been initiated to your original payment method.</p>`
            });
        } catch(e) { console.error('Seller cancel email failed', e); }
    }

    res.json(updatedOrder);
});

// @desc    Cancel order (Buyer only, only if not dispatched)
// @route   POST /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only buyer can cancel
    if (order.buyer_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to cancel this order');
    }

    // Can only cancel if still in 'pending', 'confirmed' or 'packed' status (before 'shipped')
    if (['shipped', 'dispatched', 'on_the_way', 'out_for_delivery', 'delivered', 'cancelled', 'returned'].includes(order.order_status)) {
        res.status(400);
        throw new Error('Order cannot be cancelled as it is already shipped or completed');
    }

    order.order_status = 'cancelled';
    order.cancel_reason = req.body.reason || 'Cancelled by buyer';
    order.cancelled_at = new Date();
    await order.save();

    await reverseOrderPayment(order._id);

    // Mark items as available again
    for (const item of (order.is_bundle ? order.items : [{ item_id: order.item_id }])) {
        await Item.findByIdAndUpdate(item.item_id, { status: 'available', is_sold: false });
    }

    // Notify Seller
    await Notification.create({
        user_id: order.seller_id,
        on_model: 'User',
        title: 'Order Cancelled by Buyer',
        message: `Order #${order.order_number} has been cancelled by the buyer. Reason: ${order.cancel_reason}`,
        type: 'info',
        link: `/profile?tab=orders`
    });

    try {
        const populatedCancelOrder = await Order.findById(order._id).populate('seller_id', 'email username');
        await sendEmail({
            email: populatedCancelOrder.seller_id.email,
            subject: `Order Cancelled by Buyer: #${order.order_number}`,
            message: `The buyer has cancelled this order.`,
            html: `<p>Hi ${populatedCancelOrder.seller_id.username},</p><p>The buyer has cancelled Order <b>#${order.order_number}</b>.</p><p>Reason: ${order.cancel_reason}</p><p>The items have been automatically re-listed as Available.</p>`
        });
    } catch(e) { console.error('Buyer cancel email failed', e); }

    // Notify Admin
    const adminsList = await Admin.find({ is_active: true });
    for (const admin of adminsList) {
        await Notification.create({
            user_id: admin._id,
            on_model: 'Admin',
            title: 'Order Cancelled',
            message: `Order #${order.order_number} was cancelled. Refund processed.`,
            type: 'info',
            link: `/orders`
        });
    }

    res.json({ message: 'Order cancelled successfully and refund processed' });
});

// @desc    Request a return (Buyer only, within 5 days of delivery)
// @route   POST /api/orders/:id/return
// @access  Private
const requestReturn = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only buyer can request return
    if (order.buyer_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to request return for this order');
    }

    if (order.order_status !== 'delivered') {
        res.status(400);
        throw new Error('Only delivered orders can be returned');
    }

    // Check if within 5 days limit
    if (order.delivered_at) {
        const diffTime = Math.abs(new Date() - new Date(order.delivered_at));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 5) {
            res.status(400);
            throw new Error('Return period of 5 days has expired.');
        }
    } else {
        // Fallback if delivered_at wasn't set somehow
        const diffTime = Math.abs(new Date() - new Date(order.updated_at));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 5) {
            res.status(400);
            throw new Error('Return period of 5 days has expired.');
        }
    }

    order.order_status = 'return_requested';
    order.return_reason = reason;
    order.return_requested_at = new Date();
    await order.save();

    // Notify Seller
    await Notification.create({
        user_id: order.seller_id,
        on_model: 'User',
        title: 'Return Requested',
        message: `Buyer requested a return for order #${order.order_number}. Reason: ${reason}`,
        type: 'alert',
        link: `/profile?tab=orders`
    });

    // Notify Admin
    const activeAdmins = await Admin.find({ is_active: true });
    for (const admin of activeAdmins) {
        await Notification.create({
            user_id: admin._id,
            on_model: 'Admin',
            title: 'Return Request',
            message: `Order #${order.order_number} return was requested by the buyer.`,
            type: 'warning',
            link: `/orders`
        });
    }

    res.json({ message: 'Return requested successfully', order });
});

// @desc    Process a return (Seller only)
// @route   POST /api/orders/:id/process-return
// @access  Private
const processReturn = asyncHandler(async (req, res) => {
    const { refundType, amount, reason } = req.body;
    // refundType can be 'full' or 'partial'
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (order.seller_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to process return for this order');
    }

    if (order.order_status !== 'return_requested') {
        res.status(400);
        throw new Error('Order is not in a return_requested state');
    }

    await processRefundSplit(order._id, refundType, amount, reason);

    // Update order status
    order.order_status = 'returned';
    order.payment_status = refundType === 'partial' ? 'partially_refunded' : 'refunded';
    order.partial_refund_reason = reason;
    order.refund_amount = refundType === 'full' ? order.total_amount : amount;
    await order.save();

    // Mark item as available again if full refund
    if (refundType === 'full') {
        await Item.findByIdAndUpdate(order.item_id, { status: 'available', is_sold: false });
    }

    // Notify Buyer
    await Notification.create({
        user_id: order.buyer_id,
        on_model: 'User',
        title: `Return Processed (${refundType === 'full' ? 'Full' : 'Partial'} Refund)`,
        message: `Your return for order #${order.order_number} has been processed.`,
        type: 'info',
        link: `/profile?tab=orders`
    });

    res.json({ message: 'Return processed successfully', order });
});


export {
    createOrder,
    getMyOrders,
    updateOrderAddress,
    updateOrderStatus,
    cancelOrder,
    requestReturn,
    processReturn
};
