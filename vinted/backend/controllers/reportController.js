import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';
import Admin from '../models/Admin.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Item from '../models/Item.js';

// @desc    Create a product report
// @route   POST /api/reports
// @access  Private
const createReport = asyncHandler(async (req, res) => {
    const { item_id, reason, message } = req.body;

    if (!item_id || !reason || !message) {
        res.status(400);
        throw new Error('Please provide item ID, reason, and message');
    }

    const item = await Item.findById(item_id).populate('seller_id', 'username');
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    const report = await Report.create({
        reporter_id: req.user.id,
        item_id,
        reason,
        message,
    });

    // Notify all admins (who are not explicitly inactive)
    const admins = await Admin.find({ is_active: { $ne: false } });
    
    for (const admin of admins) {
        // Create Notification
        await Notification.create({
            user_id: admin._id,
            on_model: 'Admin',
            title: `🚩 New Product Report: ${item.title}`,
            message: `User ${req.user.username} reported item "${item.title}" for: ${reason}.`,
            type: 'request',
            link: '/product-reports'
        });
    }

    // Send a Message (Conversation) to Primary Admin
    if (admins.length > 0) {
        const primaryAdmin = admins[0];
        try {
            const userObjectId = mongoose.Types.ObjectId.isValid(req.user.id)
                ? new mongoose.Types.ObjectId(req.user.id)
                : req.user.id;

            let conversation = await Conversation.findOne({
                participants: {
                    $all: [
                        { $elemMatch: { user: userObjectId, on_model: 'User' } },
                        { $elemMatch: { on_model: 'Admin' } }
                    ]
                }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [
                        { user: userObjectId, on_model: 'User' },
                        { user: primaryAdmin._id, on_model: 'Admin' }
                    ],
                    initiator_id: userObjectId,
                    initiator_model: 'User',
                    last_message: `Product Report: ${item.title}`,
                    last_message_at: new Date()
                });
            }

            await Message.create({
                conversation_id: conversation._id,
                sender_id: userObjectId,
                sender_model: 'User',
                receiver_id: primaryAdmin._id,
                receiver_model: 'Admin',
                message: `🚩 **Report Submitted**\n\n**Product:** ${item.title} (ID: ${item._id})\n**Reason:** ${reason}\n**Details:** ${message}`,
                message_type: 'system'
            });

            await Conversation.findByIdAndUpdate(conversation._id, {
                last_message: `Product Report: ${item.title}`,
                last_message_at: new Date()
            });
        } catch (msgErr) {
            console.error('Error sending message to admin:', msgErr.message);
        }
    }

    res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        report
    });
});

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

        await Notification.create({
            user_id: item.seller_id,
            on_model: 'User',
            title: `Item ${item.status === 'active' ? 'Activated' : 'Deactivated'} by Admin`,
            message: `Your item "${item.title}" has been ${item.status === 'active' ? 'activated' : 'deactivated'} by an administrator.`,
            type: 'system',
            link: `/profile?tab=listings`
        });
    } else if (action === 'delete') {
        item.is_deleted = true;
        item.status = 'deleted';
        await item.save();
        report.status = 'resolved';

        await Notification.create({
            user_id: item.seller_id,
            on_model: 'User',
            title: 'Item Deleted by Admin',
            message: `Your item "${item.title}" has been removed by an administrator following a policy review.`,
            type: 'system',
            link: `/profile?tab=listings`
        });
    }

    await report.save();

    try {
        // Notify Reporter
        await Notification.create({
            user_id: report.reporter_id,
            on_model: 'User',
            title: `Report Action Taken`,
            message: `An admin has taken action on your report regarding "${item.title}". The item was ${action === 'deactivate' ? 'deactivated' : 'deleted'}.`,
            type: 'system',
            link: `/profile?tab=messages`
        });

        // Send a Message from Admin to Reporter
        const reporterObjectId = mongoose.Types.ObjectId.isValid(report.reporter_id)
            ? new mongoose.Types.ObjectId(report.reporter_id)
            : report.reporter_id;

        let conversation = await Conversation.findOne({
            participants: {
                $all: [
                    { $elemMatch: { user: reporterObjectId, on_model: 'User' } },
                    { $elemMatch: { on_model: 'Admin' } }
                ]
            }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [
                    { user: reporterObjectId, on_model: 'User' },
                    { user: req.user._id, on_model: 'Admin' }
                ],
                initiator_id: req.user._id,
                initiator_model: 'Admin',
                last_message: `Update on your report: ${item.title}`,
                last_message_at: new Date()
            });
        }

        await Message.create({
            conversation_id: conversation._id,
            sender_id: req.user._id,
            sender_model: 'Admin',
            receiver_id: reporterObjectId,
            receiver_model: 'User',
            message: `Hello,\n\nWe have reviewed your report regarding the item "${item.title}". Following our review, we have decided to ${action === 'deactivate' ? 'deactivate' : 'delete'} the item from the platform.\n\nThank you for helping keep our community safe!`,
            message_type: 'system'
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
            last_message: `Update on your report: ${item.title}`,
            last_message_at: new Date()
        });
    } catch (err) {
        console.error("Failed to notify reporter", err);
    }

    res.status(200).json({ success: true, message: `Action ${action} performed`, report, item });
});

export { createReport, getReportsAdmin, updateReportStatus, handleReportAction };
