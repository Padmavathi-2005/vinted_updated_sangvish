import express from 'express';
import asyncHandler from 'express-async-handler';
import ContactInquiry from '../models/ContactInquiry.js';
import { adminProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all contact inquiries
// @route   GET /api/contact
// @access  Private/Admin
router.get('/', adminProtect, asyncHandler(async (req, res) => {
    const inquiries = await ContactInquiry.find({}).sort({ created_at: -1 });
    res.json(inquiries);
}));

// @desc    Submit a contact inquiry
// @route   POST /api/contact
// @access  Public
router.post('/', asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        res.status(400);
        throw new Error('Please fill all fields');
    }

    const inquiry = await ContactInquiry.create({
        name,
        email,
        subject,
        message
    });

    res.status(201).json({ 
        message: 'Your inquiry has been submitted successfully. We will get back to you shortly.',
        inquiry 
    });
}));

// @desc    Update inquiry status/reply
// @route   PUT /api/contact/:id
// @access  Private/Admin
router.put('/:id', adminProtect, asyncHandler(async (req, res) => {
    const { status, reply_message } = req.body;
    
    const inquiry = await ContactInquiry.findById(req.params.id);
    
    if (inquiry) {
        if (status) inquiry.status = status;
        if (reply_message !== undefined) inquiry.reply_message = reply_message;
        
        const updatedInquiry = await inquiry.save();
        res.json(updatedInquiry);
    } else {
        res.status(404);
        throw new Error('Inquiry not found');
    }
}));

// @desc    Delete inquiry
// @route   DELETE /api/contact/:id
// @access  Private/Admin
router.delete('/:id', adminProtect, asyncHandler(async (req, res) => {
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
