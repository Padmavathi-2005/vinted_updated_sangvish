import asyncHandler from 'express-async-handler';
import Newsletter from '../models/Newsletter.js';

// @desc    Get all newsletter subscribers (admin)
// @route   GET /api/admin/newsletter
// @access  Private (Admin)
const getSubscribers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search || '';

    const filter = {};
    if (status) filter.status = status;
    if (search) filter.email = { $regex: search, $options: 'i' };

    const [subscribers, total] = await Promise.all([
        Newsletter.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
        Newsletter.countDocuments(filter),
    ]);

    res.json({
        subscribers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
});

// @desc    Update subscriber status
// @route   PATCH /api/admin/newsletter/:id
// @access  Private (Admin)
const updateSubscriber = asyncHandler(async (req, res) => {
    const sub = await Newsletter.findById(req.params.id);
    if (!sub) {
        res.status(404);
        throw new Error('Subscriber not found');
    }
    sub.status = req.body.status || sub.status;
    await sub.save();
    res.json(sub);
});

// @desc    Delete a subscriber
// @route   DELETE /api/admin/newsletter/:id
// @access  Private (Admin)
const deleteSubscriber = asyncHandler(async (req, res) => {
    const sub = await Newsletter.findByIdAndDelete(req.params.id);
    if (!sub) {
        res.status(404);
        throw new Error('Subscriber not found');
    }
    res.json({ message: 'Subscriber removed' });
});

export { getSubscribers, updateSubscriber, deleteSubscriber };
