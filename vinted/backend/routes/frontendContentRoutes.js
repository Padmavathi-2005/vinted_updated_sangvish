import express from 'express';
import {
    getFrontendContentByLang,
    getAllFrontendContentAdmin,
    updateFrontendContent,
    bulkUpdateFrontendContent,
    uploadFrontendImage
} from '../controllers/frontendContentController.js';
import { protect, adminProtect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';


const router = express.Router();

// Public routes
router.get('/:lang', getFrontendContentByLang);

// Admin routes
router.get('/admin/all', adminProtect, getAllFrontendContentAdmin);
router.post('/admin/upload-image', adminProtect, upload.single('image'), uploadFrontendImage);
router.put('/admin/update', adminProtect, updateFrontendContent);
router.put('/admin/bulk-update', adminProtect, bulkUpdateFrontendContent);

export default router;
