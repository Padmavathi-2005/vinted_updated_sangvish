import express from 'express';
import {
    getActiveShippingCompanies,
    dispatchOrder,
    updateOrderStatus
} from '../controllers/shippingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/companies', protect, getActiveShippingCompanies);
router.put('/dispatch/:id', protect, dispatchOrder);
router.put('/status/:id', protect, updateOrderStatus);

export default router;
