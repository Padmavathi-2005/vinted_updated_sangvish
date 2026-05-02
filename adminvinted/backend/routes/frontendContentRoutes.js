import express from 'express';
import {
    getFrontendContentByLang,
    getAllFrontendContentAdmin,
    updateFrontendContent,
    bulkUpdateFrontendContent
} from '../controllers/frontendContentController.js';
import { protect, adminProtect } from '../middleware/authMiddleware.js';

import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/:lang', getFrontendContentByLang);

// Admin routes
router.get('/admin/all', adminProtect, getAllFrontendContentAdmin);
router.put('/admin/update', adminProtect, updateFrontendContent);
router.put('/admin/bulk-update', adminProtect, bulkUpdateFrontendContent);
router.post('/admin/upload-image', adminProtect, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const relativePath = `images/site/${req.file.filename}`;
    res.json({ url: relativePath });
});

export default router;
