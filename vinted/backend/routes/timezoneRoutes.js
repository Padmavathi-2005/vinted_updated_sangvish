import express from 'express';
import asyncHandler from 'express-async-handler';
import Timezone from '../models/Timezone.js';

const router = express.Router();

// @desc    Get all active timezones
// @route   GET /api/timezones
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    let timezones = await Timezone.find({ is_active: true }).sort({ offset: 1 });

    // Auto-seed if the collection is completely empty
    if (timezones.length === 0) {
        let zones = [];
        try {
            zones = Intl.supportedValuesOf('timeZone');
        } catch (e) {
            // Fallback for older Node versions if necessary, though supportedValuesOf is standard in modern Node.
            zones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
        }

        if (!zones.includes('UTC')) {
            zones.push('UTC');
        }

        const timezoneData = zones.map(zone => ({
            name: zone,
            offset: 'UTC'
        }));

        await Timezone.insertMany(timezoneData);
        timezones = await Timezone.find({ is_active: true }).sort({ offset: 1 });
    }

    res.json(timezones);
}));

export default router;
