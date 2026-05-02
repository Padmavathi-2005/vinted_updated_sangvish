import express from 'express';
import { createReview, getUserReviews, getOrderReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/', protect, createReview);
router.get('/user/:userId', getUserReviews);
router.get('/order/:orderId', protect, getOrderReview);

export default router;
