import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            user_id: req.user._id
        })
            .sort({ created_at: -1 });

        res.status(200).json(notifications);
    } catch (error) {
        console.error('❌ getNotifications Error:', error);
        res.status(500);
        throw error;
    }
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    // Check if notification belongs to user
    if (notification.user_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('User not authorized');
    }

    notification.is_read = true;
    await notification.save();

    res.status(200).json(notification);
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { user_id: req.user._id, is_read: false },
        { is_read: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    if (notification.user_id.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    await notification.deleteOne();

    res.status(200).json({ id: req.params.id });
});

// @desc    Internal endpoint to emit socket notifications from admin backend
// @route   POST /api/notifications/emit-internal
// @access  Internal
const emitInternalNotification = asyncHandler(async (req, res) => {
    const { userId, notification } = req.body;
    const secret = req.headers['x-internal-secret'];

    const expectedSecret = process.env.INTERNAL_API_SECRET || 'vinted_secret_key_123';

    if (secret !== expectedSecret) {
        res.status(401);
        throw new Error('Unauthorized internal request');
    }

    if (global.io && userId) {
        global.io.to(userId).emit('new_notification', notification);
        console.log(`📡 Emitted forwarded notification via Socket to user ${userId}:`, notification.title);
    } else {
        console.warn(`⚠️ Socket emit skipped. global.io: ${!!global.io}, userId: ${userId}`);
    }

    res.json({ success: true });
});

export {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    emitInternalNotification
};
