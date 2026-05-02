import asyncHandler from 'express-async-handler';
import Report from '../models/Report.js';
import Item from '../models/Item.js';

// @desc    Get all reports (Admin)
// @route   GET /api/reports
// @access  Private (Admin)
const getReportsAdmin = asyncHandler(async (req, res) => {
    const reports = await Report.find({})
        .populate('reporter_id', 'username email')
        .populate({
            path: 'item_id',
            populate: { path: 'seller_id', select: 'username email' }
        })
        .sort({ created_at: -1 });

    res.status(200).json(reports);
});

// @desc    Update report status (Admin)
// @route   PUT /api/reports/:id/status
// @access  Private (Admin)
const updateReportStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const report = await Report.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
    );

    if (!report) {
        res.status(404);
        throw new Error('Report not found');
    }

    res.status(200).json(report);
});

// @desc    Perform action on item based on report (Admin)
// @route   POST /api/reports/:id/action
// @access  Private (Admin)
const handleReportAction = asyncHandler(async (req, res) => {
    const { action } = req.body; // 'deactivate', 'delete'
    const report = await Report.findById(req.params.id);

    if (!report) {
        res.status(404);
        throw new Error('Report not found');
    }

    const item = await Item.findById(report.item_id);
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    if (action === 'deactivate') {
        item.status = item.status === 'active' ? 'inactive' : 'active';
        await item.save();
        report.status = 'resolved';
    } else if (action === 'delete') {
        item.is_deleted = true;
        item.status = 'deleted';
        await item.save();
        report.status = 'resolved';
    }

    await report.save();

    res.status(200).json({ success: true, message: `Action ${action} performed`, report, item });
});

export { getReportsAdmin, updateReportStatus, handleReportAction };
