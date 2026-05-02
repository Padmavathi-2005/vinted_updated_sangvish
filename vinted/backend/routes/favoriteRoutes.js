import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();
import {
    getMyFavorites,
    addToFavorites,
    removeFromFavorites
} from '../controllers/favoriteController.js';

router.get('/', protect, getMyFavorites);
router.post('/', protect, addToFavorites);
router.delete('/:itemId', protect, removeFromFavorites);

export default router;
