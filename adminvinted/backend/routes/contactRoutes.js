import express from 'express';
import asyncHandler from 'express-async-handler';
import { adminProtect } from '../middleware/authMiddleware.js';
import ContactInquiry from '../models/ContactInquiry.js';

const router = express.Router();

router.use(adminProtect);

// @desc    Get all inquiries
router.get('/', asyncHandler(async (req, res) => {
    const inquiries = await ContactInquiry.find().sort({ created_at: -1 });
    res.json(inquiries);
}));

// @desc    Update inquiry status/reply
router.put('/:id', asyncHandler(async (req, res) => {
    const { status, reply_message } = req.body;
    const inquiry = await ContactInquiry.findById(req.params.id);

    if (inquiry) {
        inquiry.status = status || inquiry.status;
        inquiry.reply_message = reply_message || inquiry.reply_message;
        const updatedInquiry = await inquiry.save();
        res.json(updatedInquiry);
    } else {
        res.status(404);
        throw new Error('Inquiry not found');
    }
}));

// @desc    Delete inquiry
router.delete('/:id', asyncHandler(async (req, res) => {
    const inquiry = await ContactInquiry.findById(req.params.id);
    if (inquiry) {
        await inquiry.deleteOne();
        res.json({ message: 'Inquiry removed' });
    } else {
        res.status(404);
        throw new Error('Inquiry not found');
    }
}));

export default router;
