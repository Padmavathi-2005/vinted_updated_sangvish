import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    emitInternalNotification
} from '../controllers/notificationController.js';

router.post('/emit-internal', emitInternalNotification);

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
