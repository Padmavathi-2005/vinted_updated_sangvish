import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
import {
    resetData,
    createBackup,
    getBackups,
    downloadBackup,
    deleteBackup
} from '../controllers/systemController.js';

const router = express.Router();

router.route('/reset-data').post(adminProtect, resetData);
router.route('/backups').get(adminProtect, getBackups).post(adminProtect, createBackup);
router.route('/download-backup/:fileName').get(adminProtect, downloadBackup);
router.route('/backups/:fileName').delete(adminProtect, deleteBackup);

export default router;
