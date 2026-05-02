import asyncHandler from 'express-async-handler';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import UserPayoutMethod from '../models/UserPayoutMethod.js';
import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import Currency from '../models/Currency.js';
import { getOrCreateWallet } from './walletController.js';

// @desc    Get my saved payout methods
// @route   GET /api/wallet/payout-methods
// @access  Private
const getMyPayoutMethods = asyncHandler(async (req, res) => {
    const methods = await UserPayoutMethod.find({ user_id: req.user._id });
    res.json(methods);
});

// @desc    Create a payout method
// @route   POST /api/wallet/payout-methods
// @access  Private
const createPayoutMethod = asyncHandler(async (req, res) => {
    const { payout_type, bank_name, account_holder_name, account_number, ifsc_code, branch_name, branch_city, branch_address, country, upi_id, paypal_email, is_default } = req.body;

    // If setting as default, unset others first
    if (is_default) {
        await UserPayoutMethod.updateMany({ user_id: req.user._id }, { is_default: false });
    }

    const method = await UserPayoutMethod.create({
        user_id: req.user._id,
        payout_type,
        bank_name,
        account_holder_name,
        account_number,
        ifsc_code,
        branch_name,
        branch_city,
        branch_address,
        country,
        upi_id,
        paypal_email,
        is_default
    });

    res.status(201).json(method);
});

// @desc    Delete a payout method
// @route   DELETE /api/wallet/payout-methods/:id
// @access  Private
const deletePayoutMethod = asyncHandler(async (req, res) => {
    const method = await UserPayoutMethod.findOne({ _id: req.params.id, user_id: req.user._id });

    if (!method) {
        res.status(404);
        throw new Error('Payout method not found');
    }

    await method.deleteOne();
    res.json({ message: 'Payout method removed' });
});

// @desc    Update a payout method
// @route   PUT /api/wallet/payout-methods/:id
// @access  Private
const updatePayoutMethod = asyncHandler(async (req, res) => {
    const { payout_type, bank_name, account_holder_name, account_number, ifsc_code, branch_name, branch_city, branch_address, country, upi_id, paypal_email, is_default } = req.body;

    const method = await UserPayoutMethod.findOne({ _id: req.params.id, user_id: req.user._id });

    if (!method) {
        res.status(404);
        throw new Error('Payout method not found');
    }

    // If setting as default, unset others first
    if (is_default) {
        await UserPayoutMethod.updateMany({ user_id: req.user._id }, { is_default: false });
    }

    method.payout_type = payout_type || method.payout_type;
    method.bank_name = bank_name || method.bank_name;
    method.account_holder_name = account_holder_name || method.account_holder_name;
    method.account_number = account_number || method.account_number;
    method.ifsc_code = ifsc_code || method.ifsc_code;
    method.branch_name = branch_name || method.branch_name;
    method.branch_city = branch_city || method.branch_city;
    method.branch_address = branch_address || method.branch_address;
    method.country = country || method.country;
    method.upi_id = upi_id || method.upi_id;
    method.paypal_email = paypal_email || method.paypal_email;
    method.is_default = is_default !== undefined ? is_default : method.is_default;

    const updatedMethod = await method.save();
    res.json(updatedMethod);
});

// @desc    Set a payout method as default
// @route   PUT /api/wallet/payout-methods/:id/default
// @access  Private
const setDefaultPayoutMethod = asyncHandler(async (req, res) => {
    const method = await UserPayoutMethod.findOne({ _id: req.params.id, user_id: req.user._id });

    if (!method) {
        res.status(404);
        throw new Error('Payout method not found');
    }

    // Unset all others
    await UserPayoutMethod.updateMany({ user_id: req.user._id }, { $set: { is_default: false } });

    // Set this one as default
    method.is_default = true;
    await method.save();

    res.json(method);
});

// @desc    Create a withdrawal request
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = asyncHandler(async (req, res) => {
    const { amount, payout_method_id, currency } = req.body;

    if (!amount || amount <= 0) {
        res.status(400);
        throw new Error('Invalid amount');
    }

    const wallet = await getOrCreateWallet(req.user._id, 'User');

    if (wallet.balance < amount) {
        res.status(400);
        throw new Error('Insufficient balance');
    }

    // Get the payout method details
    const payoutMethod = await UserPayoutMethod.findOne({ _id: payout_method_id, user_id: req.user._id });
    if (!payoutMethod) {
        res.status(400);
        throw new Error('Payout method not found or not belonging to you');
    }

    // Determine currency from system default if not provided or to ensure base currency
    let withdrawalCurrency = currency;
    if (!withdrawalCurrency) {
        const settings = await Setting.findOne({ type: 'general_settings' });
        if (settings && settings.default_currency_id) {
            const defC = await Currency.findById(settings.default_currency_id);
            if (defC) withdrawalCurrency = defC.code;
        }
    }
    if (!withdrawalCurrency) withdrawalCurrency = 'INR'; // Fallback

    // Deduct from wallet immediately (mark as pending transaction)
    wallet.balance -= amount;
    await wallet.save();

    // KEEP USER BALANCE IN SYNC
    await User.findByIdAndUpdate(req.user._id, { $set: { balance: wallet.balance } });

    const request = await WithdrawalRequest.create({
        user_id: req.user._id,
        amount,
        currency: withdrawalCurrency,
        payment_method: payoutMethod.payout_type,
        payment_details: payoutMethod.toObject(),
        payout_method_id,
        status: 'pending'
    });

    await Transaction.create({
        user_id: req.user._id,
        user_type: 'User',
        wallet_id: wallet._id,
        amount,
        type: 'debit',
        purpose: 'withdrawal',
        reference_id: request._id,
        reference_model: 'WithdrawalRequest',
        status: 'pending',
        description: `Withdrawal request for ${withdrawalCurrency} ${amount}`
    });

    // Notify Admins
    const admins = await Admin.find({ is_active: true });

    for (const admin of admins) {
        // 1. Send Notification
        await Notification.create({
            user_id: admin._id,
            on_model: 'Admin',
            title: 'Withdrawal Request',
            message: `User ${req.user.username} requested a withdrawal of ${withdrawalCurrency} ${amount}`,
            type: 'request',
            link: '/wallet/withdrawal-requests'
        });

        // 2. Send Message in a "System" conversation with Admin
        try {
            let conversation = await Conversation.findOne({
                participants: {
                    $all: [
                        { $elemMatch: { user: req.user._id, on_model: 'User' } },
                        { $elemMatch: { user: admin._id, on_model: 'Admin' } }
                    ]
                }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [
                        { user: req.user._id, on_model: 'User' },
                        { user: admin._id, on_model: 'Admin' }
                    ],
                    initiator_id: req.user._id,
                    initiator_model: 'User',
                    status: 'accepted'
                });
            }

            await Message.create({
                conversation_id: conversation._id,
                sender_id: req.user._id,
                receiver_id: admin._id,
                message: `WITHDRAWAL_REQUEST::${JSON.stringify({
                    request_id: request._id,
                    amount,
                    currency: withdrawalCurrency,
                    method: payoutMethod.payout_type,
                    payout_details: payoutMethod.toObject()
                })}`,
                message_type: 'system'
            });

            conversation.last_message = `💰 Withdrawal Request: ${withdrawalCurrency} ${amount}`;
            conversation.last_message_at = Date.now();
            await conversation.save();
        } catch (err) {
            console.error("Error creating admin message for withdrawal:", err);
        }
    }

    res.status(201).json(request);
});

// @desc    Get my withdrawal requests
// @route   GET /api/wallet/withdrawals
// @access  Private
const getMyWithdrawals = asyncHandler(async (req, res) => {
    const withdrawals = await WithdrawalRequest.find({ user_id: req.user._id }).sort({ created_at: -1 });
    res.json(withdrawals);
});

export {
    requestWithdrawal,
    getMyWithdrawals,
    getMyPayoutMethods,
    createPayoutMethod,
    updatePayoutMethod,
    deletePayoutMethod,
    setDefaultPayoutMethod
};
