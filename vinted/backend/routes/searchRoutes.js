import express from 'express';
import SearchHistory from '../models/SearchHistory.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { imageSearch } from '../controllers/aiController.js';
const router = express.Router();

// @desc    Search items by image
// @route   POST /api/search/image
// @access  Public
router.post('/image', upload.single('image'), imageSearch);

// @desc    Get user's search history (limit 5)
// @route   GET /api/search/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const history = await SearchHistory.find({ user: req.user._id })
            .sort({ updatedAt: -1 })
            .limit(5);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching history' });
    }
});

// @desc    Add or update search history
// @route   POST /api/search/history
// @access  Private
router.post('/history', protect, async (req, res) => {
    const { query } = req.body;

    if (!query || query.trim() === '') {
        return res.status(400).json({ message: 'Search query is required' });
    }

    try {
        // Find existing record for this user and query
        let historyItem = await SearchHistory.findOne({ user: req.user._id, query: query.trim() });

        if (historyItem) {
            // Update timestamp if exists
            historyItem.updatedAt = Date.now();
            await historyItem.save();
        } else {
            // Check if we need to rotate (remove oldest)
            const count = await SearchHistory.countDocuments({ user: req.user._id });

            if (count >= 5) {
                // Find and delete the oldest one
                const oldest = await SearchHistory.findOne({ user: req.user._id }).sort({ updatedAt: 1 });
                if (oldest) {
                    await SearchHistory.findByIdAndDelete(oldest._id);
                }
            }

            // Create new record
            await SearchHistory.create({
                user: req.user._id,
                query: query.trim()
            });
        }

        res.status(201).json({ message: 'Search recorded' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error saving search' });
    }
});

export default router;
