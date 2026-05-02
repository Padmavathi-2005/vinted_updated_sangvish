import express from 'express';
import asyncHandler from 'express-async-handler';
import Timezone from '../models/Timezone.js';

const router = express.Router();

// @desc    Get all active timezones
// @route   GET /api/timezones
// @access  Public (Needed for admin settings)
router.get('/', asyncHandler(async (req, res) => {
    const timezones = await Timezone.find({ is_active: true }).sort({ name: 1 });
    res.json(timezones);
}));

export default router;
