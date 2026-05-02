import asyncHandler from 'express-async-handler';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Setting from '../models/Setting.js';
import mongoose from 'mongoose';
import Delivery from '../models/Delivery.js';
import Order from '../models/Order.js';

// Helper to get or create wallet
const getOrCreateWallet = async (ownerId, ownerType) => {
    let finalOwnerId = ownerId;
    if (ownerType === 'Delivery') {
        let deliverySys = await Delivery.findOne();
        if (!deliverySys) {
            deliverySys = await Delivery.create({ name: 'Vinted Delivery Systems' });
        }
        finalOwnerId = deliverySys._id;
    }

    let wallet = await Wallet.findOne({ owner_id: finalOwnerId, owner_type: ownerType });
    if (!wallet) {
        // Fetch default currency from settings
        let defCurrency = 'INR';
        const settings = await Setting.findOne({ type: 'general_settings' });
        if (settings && settings.default_currency_id) {
            const CurrencyModel = mongoose.model('Currency');
            const defC = await CurrencyModel.findById(settings.default_currency_id);
            if (defC) defCurrency = defC.code;
        }

        wallet = await Wallet.create({
            owner_id: finalOwnerId,
            owner_type: ownerType,
            balance: 0,
            currency: defCurrency
        });
    }
    return wallet;
};

// @desc    Deduct total order amount from buyer's wallet
const deductBuyerWallet = async (buyerId, amount, orderNumbers) => {
    const buyer = await User.findById(buyerId);
    if (!buyer) throw new Error('User not found');
    
    // Use Number() to ensure math is correct
    const totalAmount = Number(amount);
    const currentBalance = Number(buyer.balance || 0);

    if (currentBalance < totalAmount) {
        throw new Error(`Insufficient wallet balance. Needed: ${totalAmount}, Available: ${currentBalance}`);
    }

    const buyerWallet = await getOrCreateWallet(buyerId, 'User');
    buyerWallet.balance -= totalAmount;
    await buyerWallet.save();

    await User.findByIdAndUpdate(buyerId, { $set: { balance: buyerWallet.balance } });

    await Transaction.create({
        user_id: buyerId,
        user_type: 'User',
        wallet_id: buyerWallet._id,
        amount: totalAmount,
        type: 'debit',
        purpose: 'order_payment',
        description: `Payment for order(s): ${Array.isArray(orderNumbers) ? orderNumbers.join(', ') : orderNumbers}`
    });

    return buyerWallet.balance;
};

// @desc    Process order payment split
const processOrderPaymentSplit = async (orderData) => {
    const { seller_id, item_price, shipping_fee, order_id } = orderData;

    const settings = await Setting.findOne();
    const commissionRate = settings?.admin_commission || 2; // Default 2%

    const adminCommission = (item_price * commissionRate) / 100;

    const actualShippingCost = 200; // Flat fee used throughout
    let deliveryAmount = 0;
    let sellerEarning = item_price - adminCommission;

    if (shipping_fee > 0) {
        // Buyer paid shipping fee on top of item price
        deliveryAmount = shipping_fee;
    } else {
        // Shipping was included in item_price. Seller bears the shipping cost.
        deliveryAmount = actualShippingCost;
        sellerEarning -= deliveryAmount;
    }

    if (sellerEarning < 0) sellerEarning = 0;

    // 1. Credit Admin Wallet
    const admin = await Admin.findOne({ is_active: true });
    if (admin) {
        const adminWallet = await getOrCreateWallet(admin._id, 'Admin');
        adminWallet.balance += adminCommission;
        await adminWallet.save();

        await Transaction.create({
            user_id: admin._id,
            user_type: 'Admin',
            wallet_id: adminWallet._id,
            amount: adminCommission,
            type: 'credit',
            purpose: 'commission',
            reference_id: order_id,
            reference_model: 'Order',
            description: `Commission from order #${order_id}`
        });

        // 2. Credit Delivery Wallet (Assigned to Admin but specifically for Delivery)
        // Creating a "Delivery" wallet owned by Admin for separation
        const deliveryWallet = await getOrCreateWallet(admin._id, 'Delivery');
        deliveryWallet.balance += deliveryAmount;
        await deliveryWallet.save();

        await Transaction.create({
            user_id: deliveryWallet.owner_id,
            user_type: 'Delivery',
            wallet_id: deliveryWallet._id,
            amount: deliveryAmount,
            type: 'credit',
            purpose: 'delivery_fee',
            reference_id: order_id,
            reference_model: 'Order',
            description: `Delivery Cost for order #${order_id}`
        });
    }

    // 3. Credit Seller Wallet
    const sellerWallet = await getOrCreateWallet(seller_id, 'User');
    sellerWallet.balance += sellerEarning;
    await sellerWallet.save();

    await User.findByIdAndUpdate(seller_id, { $inc: { balance: sellerEarning } });

    await Transaction.create({
        user_id: seller_id,
        user_type: 'User',
        wallet_id: sellerWallet._id,
        amount: sellerEarning,
        type: 'credit',
        purpose: 'sale_earning',
        reference_id: order_id,
        reference_model: 'Order',
        description: `Earning from order #${order_id} (Net: ${item_price - adminCommission} less Delivery: ${deliveryAmount})`
    });

    return { adminCommission, sellerEarning, deliveryAmount };
};

// @desc    Get user wallet and transactions
const getMyWallet = asyncHandler(async (req, res) => {
    const wallet = await getOrCreateWallet(req.user._id, 'User');
    const transactions = await Transaction.find({ wallet_id: wallet._id }).sort({ created_at: -1 });

    res.json({
        wallet,
        transactions
    });
});

// @desc    Reverse payment for a cancelled POST-CHECKOUT order (Before delivery)
const reverseOrderPayment = async (orderId) => {
    const order = await Order.findById(orderId);
    if (!order || order.payment_status !== 'paid') return;

    const { seller_id, buyer_id, item_price, shipping_fee, total_amount } = order;

    // Recalculate split
    const settings = await Setting.findOne();
    const commissionRate = settings?.admin_commission || 2;
    const adminCommission = (item_price * commissionRate) / 100;

    let deliveryAmount = shipping_fee > 0 ? shipping_fee : 200;
    let sellerEarning = item_price - adminCommission - (shipping_fee === 0 ? 200 : 0);
    if (sellerEarning < 0) sellerEarning = 0;

    const fullRefundAmount = total_amount;

    // 1. Debit Admin Wallet
    const admin = await Admin.findOne({ is_active: true });
    if (admin) {
        const adminWallet = await getOrCreateWallet(admin._id, 'Admin');
        adminWallet.balance -= adminCommission;
        await adminWallet.save();

        await Transaction.create({
            user_id: admin._id,
            user_type: 'Admin',
            wallet_id: adminWallet._id,
            amount: adminCommission,
            type: 'debit',
            purpose: 'order_refund',
            reference_id: orderId,
            reference_model: 'Order',
            description: `Commission reversal for cancelled order #${order.order_number}`
        });

        // Debit Delivery Wallet
        const deliveryWallet = await getOrCreateWallet(admin._id, 'Delivery');
        deliveryWallet.balance -= deliveryAmount;
        await deliveryWallet.save();

        await Transaction.create({
            user_id: deliveryWallet.owner_id,
            user_type: 'Delivery',
            wallet_id: deliveryWallet._id,
            amount: deliveryAmount,
            type: 'debit',
            purpose: 'order_refund',
            reference_id: orderId,
            reference_model: 'Order',
            description: `Delivery reversal for cancelled order #${order.order_number}`
        });
    }

    // 2. Debit Seller Wallet
    const sellerWallet = await getOrCreateWallet(seller_id, 'User');
    sellerWallet.balance -= sellerEarning;
    await sellerWallet.save();
    await User.findByIdAndUpdate(seller_id, { $inc: { balance: -sellerEarning } });

    await Transaction.create({
        user_id: seller_id,
        user_type: 'User',
        wallet_id: sellerWallet._id,
        amount: sellerEarning,
        type: 'debit',
        purpose: 'order_refund',
        reference_id: orderId,
        reference_model: 'Order',
        description: `Earning reversal for cancelled order #${order.order_number}`
    });

    // 3. Credit Buyer Wallet (full refund)
    const buyerWallet = await getOrCreateWallet(buyer_id, 'User');
    buyerWallet.balance += fullRefundAmount;
    await buyerWallet.save();
    await User.findByIdAndUpdate(buyer_id, { $inc: { balance: fullRefundAmount } });

    await Transaction.create({
        user_id: buyer_id,
        user_type: 'User',
        wallet_id: buyerWallet._id,
        amount: fullRefundAmount,
        type: 'credit',
        purpose: 'order_refund',
        reference_id: orderId,
        reference_model: 'Order',
        description: `Full refund for cancelled order #${order.order_number}`
    });
};

// @desc    Process refund logic for a returned item (After delivery)
const processRefundSplit = async (orderId, refundType, partialAmount, reason) => {
    const order = await Order.findById(orderId);
    if (!order) return;

    const { seller_id, buyer_id, total_amount } = order;

    let refundAmountToBuyer = 0;

    if (refundType === 'full') {
        // Buyer gets full price of the item (Delivery fee is NOT refunded since item was transported)
        refundAmountToBuyer = order.item_price;
    } else {
        // Partial Refund
        refundAmountToBuyer = Number(partialAmount);
    }

    // Since delivery happened and admin facilitated it, we deduct the refund purely from the Seller. 
    // The seller bears the cost of the return refund.
    let debitFromSeller = refundAmountToBuyer;

    // Debit Seller
    const sellerWallet = await getOrCreateWallet(seller_id, 'User');
    sellerWallet.balance -= debitFromSeller;
    await sellerWallet.save();
    await User.findByIdAndUpdate(seller_id, { $inc: { balance: -debitFromSeller } });

    await Transaction.create({
        user_id: seller_id,
        user_type: 'User',
        wallet_id: sellerWallet._id,
        amount: debitFromSeller,
        type: 'debit',
        purpose: 'return_refund_deduction',
        reference_id: orderId,
        reference_model: 'Order',
        description: `Deduction for ${refundType} return refund on order #${order.order_number}. Reason: ${reason || 'N/A'}`
    });

    // Credit Buyer
    const buyerWallet = await getOrCreateWallet(buyer_id, 'User');
    buyerWallet.balance += refundAmountToBuyer;
    await buyerWallet.save();
    await User.findByIdAndUpdate(buyer_id, { $inc: { balance: refundAmountToBuyer } });

    await Transaction.create({
        user_id: buyer_id,
        user_type: 'User',
        wallet_id: buyerWallet._id,
        amount: refundAmountToBuyer,
        type: 'credit',
        purpose: 'return_refund',
        reference_id: orderId,
        reference_model: 'Order',
        description: `Refund (${refundType}) for returned order #${order.order_number}`
    });
};

export {
    getMyWallet,
    processOrderPaymentSplit,
    reverseOrderPayment,
    processRefundSplit,
    getOrCreateWallet,
    deductBuyerWallet
};
