import express from 'express';
import { createOrder, getMyOrders, updateOrderAddress, updateOrderStatus, cancelOrder, requestReturn, processReturn } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);
router.put('/:id/address', protect, updateOrderAddress);
router.put('/:id/status', protect, updateOrderStatus);
router.post('/:id/cancel', protect, cancelOrder);
router.post('/:id/return', protect, requestReturn);
router.post('/:id/process-return', protect, processReturn);

export default router;
