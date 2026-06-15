import asyncHandler from 'express-async-handler';
import ShippingCompany from '../models/ShippingCompany.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import Admin from '../models/Admin.js';


// @desc    Get active shipping companies
// @route   GET /api/shipping/companies
// @access  Private (Sellers need this)
export const getActiveShippingCompanies = asyncHandler(async (req, res) => {
    // Fetch all active companies
    const companies = await ShippingCompany.find({ status: 'active' });
    
    // Sort logic: "DHL Express" first, then others alphabetically
    const sorted = companies.sort((a, b) => {
        if (a.company_name === 'DHL Express') return -1;
        if (b.company_name === 'DHL Express') return 1;
        return a.company_name.localeCompare(b.company_name);
    });

    res.json(sorted);
});

// @desc    Dispatch an order (Seller)
// @route   PUT /api/shipping/dispatch/:id
// @access  Private (Seller only)
export const dispatchOrder = asyncHandler(async (req, res) => {
    const { shipping_company_id, tracking_id, dispatch_date } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Validation: Only seller can dispatch
    if (order.seller_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to dispatch this order');
    }

    const previousTrackingId = order.tracking_id || '';
    const previousCompanyId = order.shipping_company_id?.toString() || '';

    const allowedStatuses = ['pending', 'confirmed', 'packed', 'placed'];
    if (!allowedStatuses.includes(order.order_status)) {
        res.status(400);
        throw new Error(`Order cannot be dispatched from '${order.order_status}' status`);
    }

    if (!tracking_id) {
        res.status(400);
        throw new Error('Tracking ID is required');
    }

    if (!shipping_company_id) {
        res.status(400);
        throw new Error('Shipping company must be selected');
    }

    order.shipping_company_id = shipping_company_id;
    order.dispatch_date = dispatch_date || new Date();

    // DHL AUTOMATION LOGIC
    const selectedCompany = await ShippingCompany.findById(shipping_company_id);
    const Setting = (await import('../models/Setting.js')).default;
    const settings = await Setting.findOne();

    if (selectedCompany?.company_name === 'DHL Express' && settings?.shipping_provider === 'dhl') {
        try {
            console.log('--- DHL Automation Triggered ---');
            const dhlService = (await import('../services/dhlService.js')).default;
            const User = (await import('../models/User.js')).default;
            const Item = (await import('../models/Item.js')).default;

            const buyer = await User.findById(order.buyer_id);
            const seller = await User.findById(order.seller_id);
            const item = await Item.findById(order.item_id);

            const dhlRes = await dhlService.createShipment(order, item, buyer, seller);
            
            order.tracking_id = dhlRes.trackingNumber;
            order.shipping_label_base64 = dhlRes.labelData;
            // order.shipping_label_url = dhlRes.trackingUrl; 
            console.log('✅ DHL Shipment Created:', dhlRes.trackingNumber);
        } catch (dhlErr) {
            console.error('❌ DHL Integration Failed:', dhlErr.message);
            // Fallback to manual if tracking_id was provided, or fail if it was meant to be automatic
            if (!tracking_id) {
                res.status(500);
                throw new Error(`DHL Integration Error: ${dhlErr.message}`);
            }
            order.tracking_id = tracking_id;
        }
    } else {
        // Manual Flow
        if (!tracking_id) {
            res.status(400);
            throw new Error('Tracking ID is required for manual shipping');
        }
        order.tracking_id = tracking_id;
    }
    
    // We don't force 'shipped' status here anymore. 
    // The seller will manually mark as shipped after verification.
    // However, we ensure it's at least confirmed
    if (order.order_status === 'pending') {
        order.order_status = 'confirmed';
        order.confirmed_at = new Date();
    }

    await order.save();

    // Populate for response & notifications
    const updatedOrder = await Order.findById(order._id)
        .populate('shipping_company_id')
        .populate('item_id', 'title');

    const newTrackingId = updatedOrder.tracking_id || '';
    const newCompanyId = updatedOrder.shipping_company_id?._id?.toString() || updatedOrder.shipping_company_id?.toString() || '';

        if (newTrackingId !== previousTrackingId || newCompanyId !== previousCompanyId) {
        // Notify parties that tracking is available/updated
        try {
            // 1. Notify Buyer
            const itemTitle = updatedOrder.is_bundle 
                ? 'Bundle Order' 
                : (updatedOrder.item_id?.title || 'Item');

            await Notification.create({
                user_id: updatedOrder.buyer_id,
                on_model: 'User',
                title: 'Tracking Info Added',
                message: `The seller has provided tracking information for your order "${itemTitle}" (#${updatedOrder.order_number}). You can now track your package.`,
                type: 'info',
                link: `/profile?tab=orders&mode=buyer&orderId=${updatedOrder._id}`
            });

            // 2. Notify Seller (Host)
            await Notification.create({
                user_id: updatedOrder.seller_id,
                on_model: 'User',
                title: 'Tracking Info Updated',
                message: `You have successfully updated the tracking information for order #${updatedOrder.order_number}.`,
                type: 'success',
                link: `/profile?tab=orders&mode=seller&orderId=${updatedOrder._id}`
            });

            // 3. Notify Admins
            const adminsList = await Admin.find({ is_active: { $ne: false } });
            for (const admin of adminsList) {
                await Notification.create({
                    user_id: admin._id,
                    on_model: 'Admin',
                    title: 'Order Tracking Updated',
                    message: `Seller has updated tracking info for Order #${updatedOrder.order_number}.`,
                    type: 'info',
                    link: `/orders`
                });
            }
        } catch (notifyErr) {
            console.error("Error sending dispatch notifications:", notifyErr);
        }
    }

    res.json(updatedOrder);
});

// @desc    Update order status timeline (Admin/Seller)
// @route   PUT /api/shipping/status/:id
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    const validStatuses = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }

    order.order_status = status;
    
    // Set Timestamps based on status
    const now = new Date();
    if (status === 'delivered') {
        if (!order.delivered_at) order.delivered_at = now;
        if (!order.out_for_delivery_at) order.out_for_delivery_at = now;
        if (!order.shipped_at) order.shipped_at = now;
        if (!order.packed_at) order.packed_at = now;
        if (!order.confirmed_at) order.confirmed_at = now;
    } else if (status === 'out_for_delivery') {
        if (!order.out_for_delivery_at) order.out_for_delivery_at = now;
        if (!order.shipped_at) order.shipped_at = now;
        if (!order.packed_at) order.packed_at = now;
        if (!order.confirmed_at) order.confirmed_at = now;
    } else if (status === 'shipped') {
        if (!order.shipped_at) order.shipped_at = now;
        if (!order.packed_at) order.packed_at = now;
        if (!order.confirmed_at) order.confirmed_at = now;
    } else if (status === 'packed') {
        if (!order.packed_at) order.packed_at = now;
        if (!order.confirmed_at) order.confirmed_at = now;
    } else if (status === 'confirmed') {
        if (!order.confirmed_at) order.confirmed_at = now;
    }

    await order.save();
    res.json({ message: `Order status updated to ${status}`, order });
});

// @desc    Estimate shipping costs for cart items
// @route   POST /api/shipping/estimate
// @access  Private
export const estimateShippingCosts = asyncHandler(async (req, res) => {
    const { items, shipping_address } = req.body;

    if (!items || items.length === 0 || !shipping_address) {
        res.status(400);
        throw new Error('Items and shipping address are required');
    }

    const companies = await ShippingCompany.find({ status: 'active' });
    
    // Sort companies
    const sortedCompanies = companies.sort((a, b) => {
        if (a.company_name === 'DHL Express') return -1;
        if (b.company_name === 'DHL Express') return 1;
        return a.company_name.localeCompare(b.company_name);
    });

    // Calculate total cost for each company
    const estimates = sortedCompanies.map(company => {
        let totalCost = 0;
        const baseRate = company.base_rate || 50;
        
        // Distance multipliers
        const localMult = 1.0;
        const regionalMult = 1.5;
        const nationalMult = 2.5;

        for (const cartItem of items) {
            if (cartItem.shipping_included) continue; // Free shipping

            // Check distance
            let distanceMult = nationalMult; // Default to national

            const sellerCity = cartItem.city?.toLowerCase().trim();
            const sellerState = cartItem.state?.toLowerCase().trim();
            const buyerCity = shipping_address.city?.toLowerCase().trim();
            const buyerState = shipping_address.state?.toLowerCase().trim();

            if (sellerCity && buyerCity && sellerCity === buyerCity) {
                distanceMult = localMult;
            } else if (sellerState && buyerState && sellerState === buyerState) {
                distanceMult = regionalMult;
            }

            totalCost += Math.round(baseRate * distanceMult);
        }

        return {
            company_id: company._id,
            company_name: company.company_name,
            logo: company.logo,
            estimated_cost: totalCost
        };
    });

    res.json(estimates);
});
