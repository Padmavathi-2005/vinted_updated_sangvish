import express from 'express';
import asyncHandler from 'express-async-handler';
import ContactInquiry from '../models/ContactInquiry.js';

const router = express.Router();

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

export default router;
