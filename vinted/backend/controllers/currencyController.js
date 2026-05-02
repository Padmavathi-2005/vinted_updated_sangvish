import asyncHandler from 'express-async-handler';
import Currency from '../models/Currency.js';

// @desc    Get all active currencies
// @route   GET /api/currencies
// @access  Public
const getCurrencies = asyncHandler(async (req, res) => {
    try {
        const currencies = await Currency.find({ is_active: true }).sort('name');
        res.json(currencies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export {
    getCurrencies,
};
