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

        if (ownerType === 'User') {
            await User.findByIdAndUpdate(finalOwnerId, { $set: { wallet_currency: defCurrency } });
        }
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
        purpose: 'payment',
        description: `Payment for order(s): ${Array.isArray(orderNumbers) ? orderNumbers.join(', ') : orderNumbers}`
    });

    return buyerWallet.balance;
};

// @desc    Process order payment split
const processOrderPaymentSplit = async (orderData) => {
    const { seller_id, item_price, shipping_fee, order_id } = orderData;

    const settings = await Setting.findOne();
    const commissionRate = settings?.admin_commission || 2; // Default 2%

    const adminCommission = Number(((item_price * commissionRate) / 100).toFixed(2));

    const actualShippingCost = 200; // Flat fee used throughout
    let deliveryAmount = 0;
    let sellerEarning = Number((item_price - adminCommission).toFixed(2));

    if (shipping_fee > 0) {
        // Buyer paid shipping fee on top of item price
        deliveryAmount = Number(shipping_fee.toFixed(2));
    } else {
        // Shipping was included in item_price. Seller bears the shipping cost.
        deliveryAmount = actualShippingCost;
        sellerEarning = Number((sellerEarning - deliveryAmount).toFixed(2));
    }

    if (sellerEarning < 0) sellerEarning = 0;

    // 1. Credit Admin Wallet (Pending)
    const admin = await Admin.findOne({ is_active: { $ne: false } });
    if (admin) {
        const adminWallet = await getOrCreateWallet(admin._id, 'Admin');
        adminWallet.pending_balance += adminCommission;
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
            status: 'pending',
            description: `Commission from order #${order_id}`
        });

        // 2. Credit Delivery Wallet (Pending)
        const deliveryWallet = await getOrCreateWallet(admin._id, 'Delivery');
        deliveryWallet.pending_balance += deliveryAmount;
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
            status: 'pending',
            description: `Delivery Cost for order #${order_id}`
        });
    }

    // 3. Credit Seller Wallet (Pending)
    const sellerWallet = await getOrCreateWallet(seller_id, 'User');
    sellerWallet.pending_balance += sellerEarning;
    await sellerWallet.save();

    await User.findByIdAndUpdate(seller_id, { $inc: { pending_balance: sellerEarning } });

    await Transaction.create({
        user_id: seller_id,
        user_type: 'User',
        wallet_id: sellerWallet._id,
        amount: sellerEarning,
        type: 'credit',
        purpose: 'sale_earning',
        reference_id: order_id,
        reference_model: 'Order',
        status: 'pending',
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
            convertedAmount: Number(((amount / orderRate) * walletRate).toFixed(2))
        };
    };

    // 1. Debit Admin Wallet
    const admin = await Admin.findOne({ is_active: { $ne: false } });
    if (admin) {
        const { wallet: adminWallet, convertedAmount: adminCommConverted } = await convertToWallet(adminCommission, admin._id, 'Admin');
        adminWallet.pending_balance -= adminCommConverted;
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
        deliveryWallet.pending_balance -= deliveryAmtConverted;
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
    sellerWallet.pending_balance -= sellerEarnConverted;
    await sellerWallet.save();
    await User.findByIdAndUpdate(seller_id, { $inc: { pending_balance: -sellerEarnConverted } });

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

    // Mark previous pending transactions as cancelled
    await Transaction.updateMany({ reference_id: orderId, status: 'pending' }, { status: 'cancelled' });

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

    const { seller_id, buyer_id, item_price, currency_id } = order;
    const orderCurrency = await Currency.findById(currency_id);
    const orderRate = orderCurrency?.exchange_rate || 1;

    // Fetch original commission rate
    const settings = await Setting.findOne();
    const commissionRate = settings?.admin_commission || 2;
    const adminCommission = Number(((item_price * commissionRate) / 100).toFixed(2));

    let refundAmountToBuyer = 0;
    let debitFromSeller = 0;
    let debitFromAdmin = 0;

    if (refundType === 'full') {
        // Buyer gets full price of the item (Delivery fee is NOT refunded since item was transported)
        refundAmountToBuyer = item_price;
        // Seller reverses item_price minus admin commission
        debitFromSeller = Number((item_price - adminCommission).toFixed(2));
        // Admin reverses exactly their commission
        debitFromAdmin = adminCommission;
    } else {
        // Partial Refund
        refundAmountToBuyer = Number(partialAmount);
        // Seller bears the entire cost of the partial refund, Admin keeps commission
        debitFromSeller = refundAmountToBuyer;
        debitFromAdmin = 0;
    }

    // Helper to convert order currency amount to user wallet currency amount
    const convertToWallet = async (amount, userId, userType) => {
        if (amount <= 0) return { wallet: null, convertedAmount: 0 };
        const wallet = await getOrCreateWallet(userId, userType);
        const walletCurrency = await Currency.findOne({ code: wallet.currency });
        const walletRate = walletCurrency?.exchange_rate || 1;
        return { 
            wallet, 
            convertedAmount: Number(((amount / orderRate) * walletRate).toFixed(2))
        };
    };

    // 1. Debit Admin (If Full Refund)
    if (debitFromAdmin > 0) {
        const admin = await Admin.findOne({ is_active: { $ne: false } });
        if (admin) {
            const { wallet: adminWallet, convertedAmount: adminDebitConverted } = await convertToWallet(debitFromAdmin, admin._id, 'Admin');
            if (adminWallet) {
                adminWallet.pending_balance -= adminDebitConverted;
                await adminWallet.save();
                
                await Transaction.create({
                    user_id: admin._id,
                    user_type: 'Admin',
                    wallet_id: adminWallet._id,
                    amount: adminDebitConverted,
                    type: 'debit',
                    purpose: 'return_refund_deduction',
                    reference_id: orderId,
                    reference_model: 'Order',
                    description: `Commission reversal for ${refundType} return refund on order #${order.order_number}`
                });
            }
        }
    }

    // 2. Debit Seller
    if (debitFromSeller > 0) {
        const { wallet: sellerWallet, convertedAmount: sellerDebitConverted } = await convertToWallet(debitFromSeller, seller_id, 'User');
        if (sellerWallet) {
            sellerWallet.pending_balance -= sellerDebitConverted;
            await sellerWallet.save();
            await User.findByIdAndUpdate(seller_id, { $inc: { pending_balance: -sellerDebitConverted } });

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
        }
    }

    // 3. Credit Buyer
    if (refundAmountToBuyer > 0) {
        const { wallet: buyerWallet, convertedAmount: buyerRefundConverted } = await convertToWallet(refundAmountToBuyer, buyer_id, 'User');
        if (buyerWallet) {
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
        }
    }
};

// @desc    Release funds from pending_balance to active balance when order completes
const releaseOrderPayment = async (orderId) => {
    // Find all pending credit transactions for this order
    const pendingTransactions = await Transaction.find({ reference_id: orderId, status: 'pending', type: 'credit' });

    for (const transaction of pendingTransactions) {
        // Find wallet
        const wallet = await Wallet.findById(transaction.wallet_id);
        if (wallet) {
            // Ensure we don't go below 0 on pending_balance just in case
            if (wallet.pending_balance >= transaction.amount) {
                wallet.pending_balance -= transaction.amount;
                wallet.balance += transaction.amount;
                await wallet.save();

                if (wallet.owner_type === 'User') {
                    await User.findByIdAndUpdate(wallet.owner_id, {
                        $inc: { pending_balance: -transaction.amount, balance: transaction.amount }
                    });
                }
            } else {
                // If pending_balance is less than transaction.amount (due to a partial refund deduction)
                const releaseAmount = wallet.pending_balance; // Release whatever is left
                wallet.pending_balance = 0;
                wallet.balance += releaseAmount;
                await wallet.save();
                if (wallet.owner_type === 'User') {
                    await User.findByIdAndUpdate(wallet.owner_id, {
                        $inc: { pending_balance: -releaseAmount, balance: releaseAmount }
                    });
                }
            }
        }
        transaction.status = 'completed';
        await transaction.save();
    }
};

export {
    getMyWallet,
    processOrderPaymentSplit,
    reverseOrderPayment,
    processRefundSplit,
    getOrCreateWallet,
    deductBuyerWallet,
    releaseOrderPayment
};
