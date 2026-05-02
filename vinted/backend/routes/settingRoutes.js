import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
    getSettingTypes,
    getSettingsByType,
    updateSettingsByType,
    getSettings
} from '../controllers/settingController.js';

const router = express.Router();

// Backward compatibility
router.get('/', getSettings);

// Get all available types for sidebar
router.get('/types', getSettingTypes);

// Operations by type
router.route('/:type')
    .get(getSettingsByType)
    .put(adminProtect, upload.fields([
        { name: 'site_logo', maxCount: 1 },
        { name: 'site_favicon', maxCount: 1 },
        { name: 'image_not_found', maxCount: 1 },
        { name: 'empty_table_image', maxCount: 1 },
        { name: 'stripe_logo', maxCount: 1 },
        { name: 'paypal_logo', maxCount: 1 }
    ]), updateSettingsByType);

export default router;
