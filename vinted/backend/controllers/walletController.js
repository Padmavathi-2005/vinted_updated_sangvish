import asyncHandler from 'express-async-handler';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Setting from '../models/Setting.js';
import mongoose from 'mongoose';
import Delivery from '../models/Delivery.js';
import Order from '../models/Order.js';
import Currency from '../models/Currency.js';

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

    const buyerWallet = await getOrCreateWallet(buyerId, 'User');
    
    // Convert amount (assumed to be in INR/Base) to Wallet Currency
    const inrCurrency = await Currency.findOne({ code: 'INR' });
    const inrRate = inrCurrency?.exchange_rate || 1;
    const walletCurrency = await Currency.findOne({ code: buyerWallet.currency });
    const walletRate = walletCurrency?.exchange_rate || 1;

    const amountInWalletCurrency = (totalAmount / inrRate) * walletRate;

    if (Number(buyerWallet.balance) < amountInWalletCurrency) {
        throw new Error(`Insufficient wallet balance. Needed: ${amountInWalletCurrency.toFixed(2)} ${buyerWallet.currency}, Available: ${buyerWallet.balance.toFixed(2)} ${buyerWallet.currency}`);
    }

    buyerWallet.balance -= amountInWalletCurrency;
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

    const { seller_id, buyer_id, item_price, shipping_fee, total_amount, currency_id } = order;
    const orderCurrency = await Currency.findById(currency_id);
    const orderRate = orderCurrency?.exchange_rate || 1;

    // Recalculate split
    const settings = await Setting.findOne();
    const commissionRate = settings?.admin_commission || 2;
    const adminCommission = (item_price * commissionRate) / 100;

    // Get INR rate for shipping fee conversion
    const inrCurrency = await Currency.findOne({ code: 'INR' });
    const inrRate = inrCurrency?.exchange_rate || 1;
    const actualShippingCostInOrderCurrency = (200 * orderRate) / inrRate;

    let deliveryAmount = shipping_fee > 0 ? shipping_fee : actualShippingCostInOrderCurrency;
    let sellerEarning = item_price - adminCommission - (shipping_fee === 0 ? actualShippingCostInOrderCurrency : 0);
    if (sellerEarning < 0) sellerEarning = 0;

    const fullRefundAmount = total_amount;

    // Helper to convert order currency amount to user wallet currency amount
    const convertToWallet = async (amount, userId, userType) => {
        const wallet = await getOrCreateWallet(userId, userType);
        const walletCurrency = await Currency.findOne({ code: wallet.currency });
        const walletRate = walletCurrency?.exchange_rate || 1;
        return { 
            wallet, 
            convertedAmount: (amount / orderRate) * walletRate 
        };
    };

    // 1. Debit Admin Wallet
    const admin = await Admin.findOne({ is_active: true });
    if (admin) {
        const { wallet: adminWallet, convertedAmount: adminCommConverted } = await convertToWallet(adminCommission, admin._id, 'Admin');
        adminWallet.balance -= adminCommConverted;
        await adminWallet.save();

        await Transaction.create({
            user_id: admin._id,
            user_type: 'Admin',
            wallet_id: adminWallet._id,
            amount: adminCommConverted,
            type: 'debit',
            purpose: 'order_refund',
            reference_id: orderId,
            reference_model: 'Order',
            description: `Commission reversal for cancelled order #${order.order_number}`
        });

        // Debit Delivery Wallet
        const { wallet: deliveryWallet, convertedAmount: deliveryAmtConverted } = await convertToWallet(deliveryAmount, admin._id, 'Delivery');
        deliveryWallet.balance -= deliveryAmtConverted;
        await deliveryWallet.save();

        await Transaction.create({
            user_id: deliveryWallet.owner_id,
            user_type: 'Delivery',
            wallet_id: deliveryWallet._id,
            amount: deliveryAmtConverted,
            type: 'debit',
            purpose: 'order_refund',
            reference_id: orderId,
            reference_model: 'Order',
            description: `Delivery reversal for cancelled order #${order.order_number}`
        });
    }

    // 2. Debit Seller Wallet
    const { wallet: sellerWallet, convertedAmount: sellerEarnConverted } = await convertToWallet(sellerEarning, seller_id, 'User');
    sellerWallet.balance -= sellerEarnConverted;
    await sellerWallet.save();
    await User.findByIdAndUpdate(seller_id, { $inc: { balance: -sellerEarnConverted } });

    await Transaction.create({
        user_id: seller_id,
        user_type: 'User',
        wallet_id: sellerWallet._id,
        amount: sellerEarnConverted,
        type: 'debit',
        purpose: 'order_refund',
        reference_id: orderId,
        reference_model: 'Order',
        description: `Earning reversal for cancelled order #${order.order_number}`
    });

    // 3. Credit Buyer Wallet (full refund)
    const { wallet: buyerWallet, convertedAmount: buyerRefundConverted } = await convertToWallet(fullRefundAmount, buyer_id, 'User');
    buyerWallet.balance += buyerRefundConverted;
    await buyerWallet.save();
    await User.findByIdAndUpdate(buyer_id, { $inc: { balance: buyerRefundConverted } });

    await Transaction.create({
        user_id: buyer_id,
        user_type: 'User',
        wallet_id: buyerWallet._id,
        amount: buyerRefundConverted,
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

    const { seller_id, buyer_id, total_amount, currency_id } = order;
    const orderCurrency = await Currency.findById(currency_id);
    const orderRate = orderCurrency?.exchange_rate || 1;

    let refundAmountToBuyer = 0;

    if (refundType === 'full') {
        // Buyer gets full price of the item (Delivery fee is NOT refunded since item was transported)
        refundAmountToBuyer = order.item_price;
    } else {
        // Partial Refund
        refundAmountToBuyer = Number(partialAmount);
    }

    // Helper to convert order currency amount to user wallet currency amount
    const convertToWallet = async (amount, userId, userType) => {
        const wallet = await getOrCreateWallet(userId, userType);
        const walletCurrency = await Currency.findOne({ code: wallet.currency });
        const walletRate = walletCurrency?.exchange_rate || 1;
        return { 
            wallet, 
            convertedAmount: (amount / orderRate) * walletRate 
        };
    };

    // Since delivery happened and admin facilitated it, we deduct the refund purely from the Seller. 
    // The seller bears the cost of the return refund.
    let debitFromSeller = refundAmountToBuyer;

    // Debit Seller
    const { wallet: sellerWallet, convertedAmount: sellerDebitConverted } = await convertToWallet(debitFromSeller, seller_id, 'User');
    sellerWallet.balance -= sellerDebitConverted;
    await sellerWallet.save();
    await User.findByIdAndUpdate(seller_id, { $inc: { balance: -sellerDebitConverted } });

    await Transaction.create({
        user_id: seller_id,
        user_type: 'User',
        wallet_id: sellerWallet._id,
        amount: sellerDebitConverted,
        type: 'debit',
        purpose: 'return_refund_deduction',
        reference_id: orderId,
        reference_model: 'Order',
        description: `Deduction for ${refundType} return refund on order #${order.order_number}. Reason: ${reason || 'N/A'}`
    });

    // Credit Buyer
    const { wallet: buyerWallet, convertedAmount: buyerRefundConverted } = await convertToWallet(refundAmountToBuyer, buyer_id, 'User');
    buyerWallet.balance += buyerRefundConverted;
    await buyerWallet.save();
    await User.findByIdAndUpdate(buyer_id, { $inc: { balance: buyerRefundConverted } });

    await Transaction.create({
        user_id: buyer_id,
        user_type: 'User',
        wallet_id: buyerWallet._id,
        amount: buyerRefundConverted,
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
