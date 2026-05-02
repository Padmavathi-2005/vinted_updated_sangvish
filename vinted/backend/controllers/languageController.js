import asyncHandler from 'express-async-handler';
import Language from '../models/Language.js';

// @desc    Get all active languages
// @route   GET /api/languages
// @access  Public
const getLanguages = asyncHandler(async (req, res) => {
    try {
        const languages = await Language.find({ is_active: true }).sort('name');
        res.json(languages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export {
    getLanguages,
};
