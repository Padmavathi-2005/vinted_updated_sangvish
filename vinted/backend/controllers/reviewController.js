import asyncHandler from 'express-async-handler';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Create a review for an order
// @route   POST /api/reviews
// @access  Private (Buyer only, after delivery)
const createReview = asyncHandler(async (req, res) => {
    const { order_id, rating, comment } = req.body;

    if (!order_id || !rating) {
        res.status(400);
        throw new Error('Order ID and rating are required');
    }

    // Get the order
    const order = await Order.findById(order_id)
        .populate('item_id', 'title')
        .populate('seller_id', 'username email');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only buyer can review
    if (order.buyer_id.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Only the buyer can leave a review');
    }

    // Only after delivery
    if (order.order_status !== 'delivered') {
        res.status(400);
        throw new Error('You can only review after the order is delivered');
    }

    // Check if already reviewed
    const existing = await Review.findOne({ order_id, reviewer_id: req.user._id });
    if (existing) {
        res.status(400);
        throw new Error('You have already reviewed this order');
    }

    const review = await Review.create({
        order_id,
        reviewer_id: req.user._id,
        reviewed_user_id: order.seller_id._id || order.seller_id,
        rating,
        comment: comment || '',
    });

    // Notify the seller
    const seller = await User.findById(order.seller_id._id || order.seller_id);
    
    await Notification.create({
        user_id: seller._id,
        title: 'New Review Received!',
        message: `${req.user.username} gave you a ${rating}-star review for "${order.item_id?.title}".`,
        type: 'info',
        link: '/profile?tab=profile_settings',
    });

    // Send email notification to seller
    try {
        await sendEmail({
            email: seller.email,
            subject: 'New Review Received on Vinted!',
            message: `${req.user.username} gave you a ${rating}-star review for "${order.item_id?.title}".`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px; text-align: center;">
                    <h2 style="color: #333;">New Review!</h2>
                    <p style="color: #666;">Great news! <b>${req.user.username}</b> has left you a review for your item "${order.item_id?.title}":</p>
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <div style="font-size: 24px; color: #ffbc00; margin-bottom: 10px;">
                            ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
                        </div>
                        <p style="font-style: italic; color: #555;">"${comment || 'No comment provided'}"</p>
                    </div>
                    <p style="color: #999; font-size: 13px;">Keep up the great work to maintain your high rating!</p>
                </div>
            `
        });
    } catch(err) {
        console.error('Review notification email failed:', err);
    }

    res.status(201).json(review);
});

// @desc    Get reviews for a specific user (seller reviews)
// @route   GET /api/reviews/user/:userId
// @access  Public
const getUserReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find({
        reviewed_user_id: req.params.userId,
        is_visible: true,
    })
        .populate('reviewer_id', 'username profile_image')
        .populate({
            path: 'order_id',
            select: 'item_id order_number',
            populate: { path: 'item_id', select: 'title images' },
        })
        .sort({ created_at: -1 });

    // Calculate average
    const totalRatings = reviews.length;
    const avgRating = totalRatings > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
        : 0;

    res.json({ reviews, avgRating: Number(avgRating), totalRatings });
});

// @desc    Check if a review exists for an order
// @route   GET /api/reviews/order/:orderId
// @access  Private
const getOrderReview = asyncHandler(async (req, res) => {
    const review = await Review.findOne({
        order_id: req.params.orderId,
        reviewer_id: req.user._id,
    });
    res.json(review || null);
});

export {
    createReview,
    getUserReviews,
    getOrderReview,
};
