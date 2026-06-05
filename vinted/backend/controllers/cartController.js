import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Item from '../models/Item.js';
import Negotiation from '../models/Negotiation.js';
import Conversation from '../models/Conversation.js';

// Helper to apply negotiated prices to cart items
const applyNegotiatedPrices = async (items, userId) => {
    if (!userId || !items || items.length === 0) return items;
    
    const userIdStr = userId.toString();
    const userObjectId = new mongoose.Types.ObjectId(userIdStr);
    
    const processedItems = [];
    
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (!item || !item._id) continue;
        
        let itemObj = item.toObject ? item.toObject() : item;
        
        try {
            const [negRecord, convRecord] = await Promise.all([
                Negotiation.findOne({
                    item_id: itemObj._id,
                    $or: [ { buyer_id: userObjectId }, { buyer_id: userIdStr } ],
                    status: 'active'
                }),
                Conversation.findOne({
                    item_id: itemObj._id,
                    'participants.user': { $in: [userObjectId, userIdStr] },
                    accepted_offer_amount: { $ne: null }
                }).sort({ updated_at: -1 })
            ]);

            if (negRecord) {
                itemObj.price = negRecord.agreed_price;
            } else if (convRecord) {
                itemObj.price = convRecord.accepted_offer_amount;
            }
        } catch (err) {
            console.error('Error fetching negotiated price for cart item:', err);
        }
        
        processedItems.push(itemObj);
    }
    
    return processedItems;
};

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id }).populate({
            path: 'items',
            populate: {
                path: 'seller_id',
                select: 'username bundle_discounts'
            }
        });

        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        // Only filter out items that were actually deleted by the seller
        const existingItems = cart.items.filter(item => item && item.status !== 'deleted');

        if (existingItems.length !== cart.items.length) {
            cart.items = existingItems.map(item => item._id);
            await cart.save();
        }
        const finalItems = await applyNegotiatedPrices(existingItems, req.user._id);
        res.status(200).json(finalItems);
    } catch (error) {
        res.status(500).json({ message: 'Server Error fetching cart', error: error.message });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
export const addToCart = async (req, res) => {
    try {
        const { itemId } = req.body;
        
        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        if (item.status === 'sold' || item.is_sold || item.is_ordered) {
            return res.status(400).json({ message: 'Item is no longer available' });
        }

        if (item.seller_id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot add your own item to cart' });
        }

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        if (!cart.items.includes(itemId)) {
            cart.items.push(itemId);
            await cart.save();
        }

        await cart.populate({
            path: 'items',
            populate: {
                path: 'seller_id',
                select: 'username bundle_discounts'
            }
        });

        const finalItems = await applyNegotiatedPrices(cart.items, req.user._id);
        res.status(200).json(finalItems);
    } catch (error) {
        res.status(500).json({ message: 'Server Error adding to cart', error: error.message });
    }
};

// @desc    Remove item from cart
// @route   POST /api/cart/remove
// @access  Private
export const removeFromCart = async (req, res) => {
    try {
        const { itemId, itemIds } = req.body;

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(200).json([]);
        }

        const idsToRemove = itemIds ? itemIds : (itemId ? [itemId] : []);

        if (idsToRemove.length > 0) {
            // Must cast to ObjectId for $pullAll to work correctly on direct DB updates
            const objectIdsToRemove = idsToRemove.map(id => new mongoose.Types.ObjectId(id));
            await Cart.updateOne(
                { _id: cart._id },
                { $pullAll: { items: objectIdsToRemove } }
            );
        }

        const updatedCart = await Cart.findById(cart._id).populate({
            path: 'items',
            populate: {
                path: 'seller_id',
                select: 'username bundle_discounts'
            }
        });
        const finalItems = await applyNegotiatedPrices(updatedCart.items, req.user._id);
        res.status(200).json(finalItems);
    } catch (error) {
        res.status(500).json({ message: 'Server Error removing from cart', error: error.message });
    }
};

// @desc    Merge guest cart
// @route   POST /api/cart/merge
// @access  Private
export const mergeCart = async (req, res) => {
    try {
        const { itemIds } = req.body; // Array of item IDs from guest cart

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        let isUpdated = false;
        if (itemIds && Array.isArray(itemIds)) {
            for (const itemId of itemIds) {
                // Check if valid
                const item = await Item.findById(itemId);
                if (item && item.status === 'active' && !item.is_sold && !item.is_ordered && item.seller_id.toString() !== req.user._id.toString()) {
                    if (!cart.items.includes(itemId)) {
                        cart.items.push(itemId);
                        isUpdated = true;
                    }
                }
            }
        }

        if (isUpdated) {
            await cart.save();
        }

        await cart.populate({
            path: 'items',
            populate: {
                path: 'seller_id',
                select: 'username bundle_discounts'
            }
        });
        const finalItems = await applyNegotiatedPrices(cart.items, req.user._id);
        res.status(200).json(finalItems);
    } catch (error) {
        res.status(500).json({ message: 'Server Error merging cart', error: error.message });
    }
};
