import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
import { 
    getReportsAdmin, 
    updateReportStatus, 
    handleReportAction 
} from '../controllers/reportController.js';

const router = express.Router();

// Admin Routes
router.get('/', adminProtect, getReportsAdmin);
router.put('/:id/status', adminProtect, updateReportStatus);
router.post('/:id/action', adminProtect, handleReportAction);

export default router;
