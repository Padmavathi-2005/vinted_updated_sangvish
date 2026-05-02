import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import optimizeImages from '../middleware/imageOptimizer.js';
import {
    getSettingTypes,
    getSettingsByType,
    updateSettingsByType
} from '../controllers/settingController.js';

const router = express.Router();

// Get all available types for sidebar
router.get('/types', getSettingTypes);

// Operations by type
router.route('/:type')
    .get(getSettingsByType)
    .put(adminProtect, upload.any(), optimizeImages, updateSettingsByType);

export default router;
