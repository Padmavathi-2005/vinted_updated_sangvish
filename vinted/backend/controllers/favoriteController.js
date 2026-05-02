import asyncHandler from 'express-async-handler';
import Favorite from '../models/Favorite.js';
import Item from '../models/Item.js';

// @desc    Get user favorites (Wishlist)
// @route   GET /api/favorites
// @access  Private
const getMyFavorites = asyncHandler(async (req, res) => {
    const { populate, page, limit } = req.query;

    if (populate === 'true') {
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 12;
        const skip = (pageNum - 1) * limitNum;

        const queryObj = { user_id: req.user.id };
        const totalCount = await Favorite.countDocuments(queryObj);

        // Return full item objects with pagination
        const favorites = await Favorite.find(queryObj)
            .populate({
                path: 'item_id',
                populate: [
                    { path: 'seller_id', select: 'username email profile_image rating_avg rating_count is_deleted status' },
                    { path: 'category_id', select: 'name' }
                ]
            })
            .skip(skip)
            .limit(limitNum);

        // Extract and filter out any potentially null items
        const items = favorites.map(fav => fav.item_id).filter(item => item != null);

        return res.status(200).json({
            items,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            page: pageNum
        });
    }

    // Default: Return just IDs (array) for lightweight state syncing
    const favorites = await Favorite.find({ user_id: req.user.id }).select('item_id');
    const favoriteIds = favorites.map(fav => fav.item_id);
    res.status(200).json(favoriteIds);
});

// @desc    Add item to favorites
// @route   POST /api/favorites
// @access  Private
const addToFavorites = asyncHandler(async (req, res) => {
    const { item_id } = req.body;

    if (!item_id) {
        res.status(400);
        throw new Error('Item ID is required');
    }

    // Check if item exists
    const item = await Item.findById(item_id);
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
        user_id: req.user.id,
        item_id
    });

    if (existingFavorite) {
        res.status(400);
        throw new Error('Item already in wishlist');
    }

    const favorite = await Favorite.create({
        user_id: req.user.id,
        item_id
    });

    // Update item likes count
    const updatedItem = await Item.findByIdAndUpdate(
        item_id,
        { $inc: { likes_count: 1 } },
        { new: true }
    );

    console.log(`Updated Item ${item_id} likes_count to: ${updatedItem?.likes_count}`);

    res.status(201).json(favorite);
});

// @desc    Remove item from favorites
// @route   DELETE /api/favorites/:itemId
// @access  Private
const removeFromFavorites = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
        user_id: req.user.id,
        item_id: itemId
    });

    if (!favorite) {
        res.status(404);
        throw new Error('Item not found in wishlist');
    }

    // Update item likes count (prevent negative)
    const item = await Item.findById(itemId);
    if (item && item.likes_count > 0) {
        await Item.findByIdAndUpdate(itemId, { $inc: { likes_count: -1 } });
    } else if (item) {
        await Item.findByIdAndUpdate(itemId, { $set: { likes_count: 0 } });
    }

    res.status(200).json({ id: itemId, message: 'Removed from wishlist' });
});

export {
    getMyFavorites,
    addToFavorites,
    removeFromFavorites
};
