import express from 'express';
import {
    getActiveShippingCompanies,
    dispatchOrder,
    updateOrderStatus,
    estimateShippingCosts
} from '../controllers/shippingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/companies', protect, getActiveShippingCompanies);
router.post('/estimate', protect, estimateShippingCosts);
router.put('/dispatch/:id', protect, dispatchOrder);
router.put('/status/:id', protect, updateOrderStatus);

export default router;
