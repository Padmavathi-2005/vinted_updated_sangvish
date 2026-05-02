import express from 'express';
import { protect, adminProtect } from '../middleware/authMiddleware.js';
import { 
    createReport, 
    getReportsAdmin, 
    updateReportStatus, 
    handleReportAction 
} from '../controllers/reportController.js';

const router = express.Router();

// User Route
router.post('/', protect, createReport);

// Admin Routes
router.get('/', adminProtect, getReportsAdmin);
router.put('/:id/status', adminProtect, updateReportStatus);
router.post('/:id/action', adminProtect, handleReportAction);

export default router;
