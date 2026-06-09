import express from 'express';
import { getPaymentMethods, createStripeIntent, stripeWebhook, verifyDeposit } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/methods', getPaymentMethods);
router.post('/stripe/create-intent', protect, createStripeIntent);
router.post('/stripe/verify-deposit', protect, verifyDeposit);
router.post('/webhook', stripeWebhook);

export default router;
