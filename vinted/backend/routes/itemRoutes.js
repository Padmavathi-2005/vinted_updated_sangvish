import express from 'express';
import { getItems, getItemById, getSimilarItems, getMyItems, setItem, updateItem, deleteItem, applyDiscount, removeDiscount } from '../controllers/itemController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import optimizeImages from '../middleware/imageOptimizer.js';
const router = express.Router();

router.route('/').get(getItems).post(protect, upload.array('images', 20), optimizeImages, setItem);

router.get('/myitems', protect, getMyItems);
router.get('/:id/similar', getSimilarItems);

router.route('/:id').get(optionalProtect, getItemById).put(protect, upload.array('images', 20), optimizeImages, updateItem).delete(protect, deleteItem);

// Discount routes
router.put('/:id/discount', protect, applyDiscount);
router.delete('/:id/discount', protect, removeDiscount);

export default router;

