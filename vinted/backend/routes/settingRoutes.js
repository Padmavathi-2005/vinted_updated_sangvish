import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import optimizeImages from '../middleware/imageOptimizer.js';
import {
    getSettingTypes,
    getSettingsByType,
    updateSettingsByType,
    getSettings,
    backupDB,
    restoreDB,
    mailCheck
} from '../controllers/settingController.js';

const router = express.Router();

// Backward compatibility
router.get('/', getSettings);

// Get all available types for sidebar
router.get('/types', getSettingTypes);

// Operations by type
router.route('/:type')
    .get(getSettingsByType)
    .put(adminProtect, upload.any(), optimizeImages, updateSettingsByType);
    
// Backup/Restore routes (Public as per request for easy browser access)
router.get('/db/backup', backupDB);
router.get('/db/restore', restoreDB);
router.post('/db/backup', backupDB);
router.post('/db/restore', restoreDB);

// Mail check route
router.get('/db/mail_check', mailCheck);
router.get('/mail_check', mailCheck);
router.post('/db/mail_check', mailCheck);
router.post('/mail_check', mailCheck);

export default router;
