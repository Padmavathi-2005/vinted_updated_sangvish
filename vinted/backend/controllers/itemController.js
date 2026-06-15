import fs from 'fs';
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Item from '../models/Item.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Currency from '../models/Currency.js';
import ItemType from '../models/ItemType.js';
import ItemView from '../models/ItemView.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Negotiation from '../models/Negotiation.js';


// @desc    Get single item by ID
// @route   GET /api/items/:id
// @access  Public
const getItemById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
        query = { _id: id };
    } else {
        query = { slug: id };
    }

    const item = await Item.findOne(query)
        .populate('seller_id', 'username email profile_image created_at rating_avg rating_count')
        .populate('category_id', 'name slug')
        .populate('subcategory_id', 'name slug')
        .populate('item_type_id', 'name slug')
        .populate('currency_id', 'code symbol exchange_rate');

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Check for accepted offer for this user
    let acceptedOffer = null;
    const currentUser = req.user;
    
    if (currentUser) {
        try {
            const userId = currentUser._id.toString();
            const userObjectId = new mongoose.Types.ObjectId(userId);
            
            // SUPER BROAD SEARCH: Check both tables and all roles
            const [negRecord, convRecord] = await Promise.all([
                Negotiation.findOne({
                    item_id: item._id,
                    $or: [
                        { buyer_id: userObjectId }, { seller_id: userObjectId },
                        { buyer_id: userId }, { seller_id: userId }
                    ],
                    status: 'active'
                }),
                Conversation.findOne({
                    item_id: item._id,
                    'participants.user': { $in: [userObjectId, userId] },
                    accepted_offer_amount: { $ne: null }
                }).sort({ updated_at: -1 })
            ]);

            if (negRecord) {
                acceptedOffer = { amount: negRecord.agreed_price, source: 'neg' };
            } else if (convRecord) {
                acceptedOffer = { amount: convRecord.accepted_offer_amount, source: 'conv' };
            }
        } catch (err) {
            console.error('Price lookup error:', err.message);
        }
    }

    // IP/User-based unique view counting
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
    const viewerId = currentUser ? currentUser._id : null;
    try {
        const queryOr = [{ ip_address: ip }];
        if (viewerId) queryOr.push({ user_id: viewerId });
        
        const existingView = await ItemView.findOne({
            item_id: item._id,
            $or: queryOr
        });
        
        if (!existingView) {
            await ItemView.create({ item_id: item._id, ip_address: ip, user_id: viewerId });
            await Item.findByIdAndUpdate(item._id, { $inc: { views_count: 1 } });
        } else if (viewerId && !existingView.user_id) {
            // Update anonymous view with user_id now that they are logged in
            existingView.user_id = viewerId;
            await existingView.save();
        }
    } catch (err) {
        // Ignore duplicate key errors from race conditions
        if (err.code !== 11000) {
            console.error('View tracking error:', err.message);
        }
    }

    const itemObj = item.toObject();
    itemObj.accepted_offer = acceptedOffer;
    itemObj.debug_offer = {
        user_identified: !!currentUser,
        user_id: currentUser ? currentUser._id : null,
        offer_found: !!acceptedOffer,
        source: acceptedOffer ? acceptedOffer.source : 'none'
    };

    res.status(200).json(itemObj);
});

// @desc    Get similar items (same category/subcategory, excluding current)
// @route   GET /api/items/:id/similar
// @access  Public
const getSimilarItems = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
        query = { _id: id };
    } else {
        query = { slug: id };
    }

    const item = await Item.findOne(query);
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Find items in same subcategory first, fallback to category
    let similar = await Item.find({
        _id: { $ne: item._id },
        status: 'active',
        is_deleted: false,
        is_sold: { $ne: true },
        is_ordered: { $ne: true },
        subcategory_id: item.subcategory_id,
    })
        .populate('seller_id', 'username profile_image rating_avg rating_count')
        .populate('currency_id', 'code symbol')
        .populate('category_id', 'name')
        .sort({ views_count: -1 })
        .limit(8);

    // If not enough, fill from the same category
    if (similar.length < 4) {
        const existingIds = [item._id, ...similar.map(s => s._id)];
        const moreSimilar = await Item.find({
            _id: { $nin: existingIds },
            status: 'active',
            is_deleted: false,
            is_sold: { $ne: true },
            is_ordered: { $ne: true },
            category_id: item.category_id,
        })
            .populate('seller_id', 'username profile_image rating_avg rating_count')
            .populate('currency_id', 'code symbol')
            .populate('category_id', 'name')
            .sort({ views_count: -1 })
            .limit(8 - similar.length);
        similar = [...similar, ...moreSimilar];
    }

    res.status(200).json(similar);
});

// @desc    Get items
// @route   GET /api/items
// @access  Public
const getItems = asyncHandler(async (req, res) => {
    try {
        const { sort, limit, page, search, category, subcategory, itemType, brand, size, color, condition, minPrice, maxPrice, material, user_exchange_rate } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 12;
        const skip = (pageNum - 1) * limitNum;
        const userRate = parseFloat(user_exchange_rate) || 1;

        let queryObj = { 
            status: { $in: ['active', 'available'] }, 
            is_deleted: false, 
            is_sold: { $ne: true },
            is_ordered: { $ne: true }
        };

        // --- Category/Subcategory Slugs ---
        if (category) {
            const cat = await Category.findOne({ slug: category });
            if (cat) queryObj.category_id = cat._id;
        }
        if (subcategory) {
            const sub = await Subcategory.findOne({ slug: subcategory });
            if (sub) {
                queryObj.subcategory_id = mongoose.Types.ObjectId.isValid(sub._id) 
                    ? new mongoose.Types.ObjectId(sub._id) 
                    : sub._id;
            }
        }
        if (itemType) {
            const iType = await ItemType.findOne({ slug: itemType });
            if (iType) queryObj.item_type_id = iType._id;
        }

        // --- Basic Filters ---
        if (brand) queryObj.brand = { $regex: new RegExp(brand, 'i') };
        if (size) queryObj.size = { $regex: new RegExp(`^${size}$`, 'i') };
        if (color) queryObj.color = { $regex: new RegExp(`^${color}$`, 'i') };
        if (condition) queryObj.condition = { $regex: new RegExp(`^${condition}$`, 'i') };
        if (material) {
            queryObj.attributes = {
                $elemMatch: {
                    key: { $regex: /material/i },
                    value: { $regex: new RegExp(material, 'i') }
                }
            };
        }

        // --- Search Keywords ---
        if (search) {
            let cleanSearch = search;
            const isDiscountSearch = /\b(discount|sale|offer|cheap|deal|reduced|promo)\b/i.test(search);
            if (isDiscountSearch) {
                queryObj.original_price = { $gt: 0 };
                queryObj.$expr = { $lt: ['$price', '$original_price'] };
                cleanSearch = search.replace(/\b(discount|sale|offer|cheap|deal|reduced|promo)\b/gi, '').trim();
            }

            if (cleanSearch) {
                const searchRegex = new RegExp(cleanSearch, 'i');
                const catRegex = new RegExp(`\\b${cleanSearch}\\b`, 'i');
                const [mCat, mSub, mType] = await Promise.all([
                    Category.find({ name: catRegex }).select('_id'),
                    Subcategory.find({ name: catRegex }).select('_id'),
                    ItemType.find({ name: catRegex }).select('_id')
                ]);

                const or = [{ title: searchRegex }, { description: searchRegex }];
                if (mCat.length) or.push({ category_id: { $in: mCat.map(c => c._id) } });
                if (mSub.length) or.push({ subcategory_id: { $in: mSub.map(s => s._id) } });
                if (mType.length) or.push({ item_type_id: { $in: mType.map(t => t._id) } });
                queryObj.$or = or;
            }
        }

        // --- Aggregation Pipeline ---
        let pipeline = [{ $match: queryObj }];

        // Join currency for conversion
        pipeline.push(
            { $lookup: { from: 'currencies', localField: 'currency_id', foreignField: '_id', as: 'curr' } },
            { $unwind: { path: '$curr', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    convertedPrice: {
                        $multiply: [
                            { $divide: [{ $toDouble: { $ifNull: ["$price", 0] } }, { $ifNull: ['$curr.exchange_rate', 1] }] },
                            userRate
                        ]
                    }
                }
            }
        );

        // Accurate Price Range Filtering
        if (minPrice || maxPrice) {
            const range = {};
            if (minPrice) range.$gte = Math.max(0, parseFloat(minPrice));
            if (maxPrice) range.$lte = Math.max(0, parseFloat(maxPrice));
            pipeline.push({ $match: { convertedPrice: range } });
        }

        // --- Sorting ---
        if (sort === 'popular') {
            pipeline.push(
                { $lookup: { from: 'users', localField: 'seller_id', foreignField: '_id', as: 'seller' } },
                { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        popularityScore: {
                            $add: [
                                { $multiply: [{ $toDouble: { $ifNull: ['$views_count', 0] } }, 1] },
                                { $multiply: [{ $toDouble: { $ifNull: ['$likes_count', 0] } }, 5] },
                                { $multiply: [{ $toDouble: { $ifNull: ['$seller.rating_avg', 0] } }, 10] },
                                {
                                    $switch: {
                                        branches: [
                                            { case: { $eq: ['$condition', 'New'] }, then: 20 },
                                            { case: { $eq: ['$condition', 'Very Good'] }, then: 15 },
                                            { case: { $eq: ['$condition', 'Good'] }, then: 10 }
                                        ],
                                        default: 0
                                    }
                                },
                                {
                                    $multiply: [
                                        { 
                                            $divide: [
                                                { 
                                                    $subtract: [
                                                        new Date(), 
                                                        { $ifNull: [{ $toDate: "$created_at" }, new Date()] }
                                                    ] 
                                                }, 
                                                86400000
                                            ] 
                                        },
                                        -2
                                    ]
                                }
                            ]
                        }
                    }
                },
                { $sort: { popularityScore: -1 } }
            );
        } else {
            let sOrder = { created_at: -1 };
            if (sort === 'price_asc') sOrder = { convertedPrice: 1, created_at: -1 };
            else if (sort === 'price_desc') sOrder = { convertedPrice: -1, created_at: -1 };
            else if (sort === 'oldest') sOrder = { created_at: 1 };
            else if (sort === 'discounted') sOrder = { original_price: -1, created_at: -1 };
            pipeline.push({ $sort: sOrder });
        }

        // --- Execute ---
        const totalResult = await Item.aggregate([...pipeline, { $count: 'total' }]);
        const totalCount = totalResult[0]?.total || 0;

        const results = await Item.aggregate([
            ...pipeline,
            { $skip: skip },
            { $limit: limitNum }
        ]);

        // Manually apply prefix normalization because aggregation bypasses model hooks
        const normalizedResults = results.map(item => {
            if (item.images && Array.isArray(item.images)) {
                item.images = item.images.map(img => {
                    let finalImg = img;
                    
                    // Handle case where image might be stored as an object {0: 'i', 1: 'm', ...}
                    if (finalImg && typeof finalImg === 'object' && !Array.isArray(finalImg)) {
                        try {
                            finalImg = Object.values(finalImg).join('');
                        } catch (e) {
                            finalImg = String(finalImg);
                        }
                    }
                    
                    if (finalImg && typeof finalImg === 'string') {
                        if (finalImg.startsWith('http')) return finalImg;
                        if (finalImg.startsWith('images/')) return finalImg;
                        return `images/items/${finalImg}`;
                    }
                    return finalImg;
                });
            }
            return item;
        });

        const items = await Item.populate(normalizedResults, [
            { path: 'seller_id', select: 'username profile_image rating_avg rating_count' },
            { path: 'category_id', select: 'name' },
            { path: 'currency_id', select: 'code symbol' }
        ]);

        res.status(200).json({
            items,
            totalCount,
            page: pageNum,
            totalPages: Math.ceil(totalCount / limitNum)
        });
    } catch (error) {
        const errorDetails = `[${new Date().toISOString()}] GET_ITEMS_FATAL\n` +
                             `Query: ${JSON.stringify(req.query)}\n` +
                             `Error: ${error.message}\n` +
                             `Stack: ${error.stack}\n\n`;
        fs.appendFileSync('G_API_ERROR.log', errorDetails);
        console.error('Error in getItems:', error);
        res.status(500).json({ 
            message: error.message,
            debug_info: "Check G_API_ERROR.log for full trace"
        });
    }
});

// @desc    Get logged in user's items
// @route   GET /api/items/myitems
// @access  Private
const getMyItems = asyncHandler(async (req, res) => {
    const { page, limit, is_sold } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const queryObj = { seller_id: req.user.id };
    if (is_sold !== undefined) {
        queryObj.is_sold = is_sold === 'true';
    }
    const totalCount = await Item.countDocuments(queryObj);

    const items = await Item.find(queryObj)
        .populate('category_id', 'name')
        .populate('subcategory_id', 'name')
        .populate('seller_id', 'username email profile_image rating_avg rating_count is_deleted status')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        page: pageNum
    });
});

// @desc    Set item
// @route   POST /api/items
// @access  Private (Seller only usually, but for now authenticated user)
const setItem = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        brand,
        size,
        color,
        condition,
        price,
        currency, // This might be a code like 'INR' 
        currency_id, // Also support currency_id
        negotiable,
        shipping_included,
        category_id,
        subcategory_id,
        item_type_id,
        attributes, // JSON string from frontend
        seo_title,
        seo_description,
        seo_keywords
    } = req.body;

    if (!title || !price || !category_id || !subcategory_id) {
        res.status(400);
        throw new Error('Please add all required fields');
    }

    // Handle Currency: Find by code or ID
    let currencyId;
    const submittedCurrency = currency || currency_id;
    
    if (submittedCurrency) {
        // Try finding by code first
        const currencyDoc = await Currency.findOne({ code: submittedCurrency.toUpperCase() });
        if (currencyDoc) {
            currencyId = currencyDoc._id;
        } else {
            // Assume it's an ID if not found by code, or fail gracefully
            // If currency is provided as ID string
            if (submittedCurrency.match(/^[0-9a-fA-F]{24}$/)) {
                currencyId = submittedCurrency;
            } else {
                // Fallback to default if not found or invalid
                const defaultCurrency = await Currency.findOne({ is_active: true }); // Just pick one active
                if (defaultCurrency) currencyId = defaultCurrency._id;
            }
        }
    } else {
        // Default currency if none provided
        const defaultCurrency = await Currency.findOne({ code: 'INR' });
        if (defaultCurrency) currencyId = defaultCurrency._id;
    }

    if (!currencyId) {
        res.status(400);
        throw new Error('Invalid currency');
    }

    // Handle Images
    let images = [];
    if (req.files) {
        images = req.files.map(file => {
            // Store only the path relative to base: images/items/file.jpg
            const filename = file.filename;
            return `images/items/${filename}`;
        });
    }

    const item = await Item.create({
        seller_id: req.user.id,
        title,
        description,
        brand,
        category_id,
        subcategory_id,
        item_type_id: item_type_id || null,
        size,
        color,
        condition,
        price,
        currency_id: currencyId,
        negotiable: negotiable === 'true' || negotiable === true,
        shipping_included: shipping_included === 'true' || shipping_included === true,
        images,
        status: 'active',
        attributes: attributes ? JSON.parse(attributes) : [],
        lat: req.body.lat ? parseFloat(req.body.lat) : null,
        lng: req.body.lng ? parseFloat(req.body.lng) : null,
        location: req.body.location || '',
        location_label: req.body.location_label || '',
        country: req.body.country || '',
        state: req.body.state || '',
        city: req.body.city || '',
        pincode: req.body.pincode || '',
        seo_title: seo_title || '',
        seo_description: seo_description || '',
        seo_keywords: seo_keywords || ''
    });

    res.status(201).json(item);
});

const updateItem = asyncHandler(async (req, res) => {
    const logPath = 'update_debug.log';
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] UPDATE ATTEMPT ID=${req.params.id} User=${req.user.id}\n`);
    fs.appendFileSync(logPath, `Body Keys: ${Object.keys(req.body).join(',')}\n`);
    fs.appendFileSync(logPath, `Files: ${req.files ? req.files.length : 0}\n`);

    const item = await Item.findById(req.params.id);

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Ensure logged in user matches the item seller
    const sellerId = item.seller_id._id ? item.seller_id._id.toString() : item.seller_id.toString();
    if (sellerId !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const {
        title,
        description,
        brand,
        size,
        color,
        condition,
        price,
        negotiable,
        shipping_included,
        category_id,
        subcategory_id,
        item_type_id,
        existingImages, // JSON array from frontend
        imageOrder, // JSON array of ordered items from frontend
        attributes, // JSON array from frontend
        status,
        is_sold,
        seo_title,
        seo_description,
        seo_keywords
    } = req.body;

    // Process images
    let updatedImages = [];
    const parsedOrder = imageOrder ? (typeof imageOrder === 'string' ? JSON.parse(imageOrder) : imageOrder) : null;

    if (parsedOrder && Array.isArray(parsedOrder)) {
        // Map uploaded files by original name and size
        const uploadedMap = {};
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                const key = `${file.originalname}-${file.size}`;
                uploadedMap[key] = `images/items/${file.filename}`;
            });
        }

        parsedOrder.forEach(item => {
            if (item.type === 'existing') {
                if (typeof item.value === 'string') {
                    const parts = item.value.split('/');
                    const filename = parts[parts.length - 1];
                    updatedImages.push(`images/items/${filename}`);
                }
            } else if (item.type === 'new') {
                const key = `${item.name}-${item.size}`;
                if (uploadedMap[key]) {
                    updatedImages.push(uploadedMap[key]);
                }
            }
        });
    } else {
        // Fallback: 1. Keep images that were already in the DB and not removed in the frontend
        if (existingImages) {
            try {
                const parsedExisting = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
                if (Array.isArray(parsedExisting)) {
                    updatedImages = parsedExisting.map(img => {
                        if (typeof img !== 'string') return img;
                        // Strip any full URL or repeated prefixes
                        // We only want images/items/filename
                        const parts = img.split('/');
                        const filename = parts[parts.length - 1];
                        return `images/items/${filename}`;
                    });
                }
            } catch (e) {
                console.error("Error parsing existingImages:", e);
            }
        }

        // Fallback: 2. Add new uploads
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `images/items/${file.filename}`);
            updatedImages = [...updatedImages, ...newImages];
        }
    }

    // Build update object dynamically to only update provided fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (brand !== undefined) updateData.brand = brand;
    if (size !== undefined) updateData.size = size;
    if (color !== undefined) updateData.color = color;
    if (condition !== undefined) updateData.condition = condition;
    if (price !== undefined) updateData.price = parseFloat(price) || 0;
    if (negotiable !== undefined) updateData.negotiable = negotiable === 'true' || negotiable === true;
    if (shipping_included !== undefined) updateData.shipping_included = shipping_included === 'true' || shipping_included === true;
    if (category_id) updateData.category_id = category_id;
    if (subcategory_id) updateData.subcategory_id = subcategory_id;
    if (item_type_id) updateData.item_type_id = item_type_id;
    else if (item_type_id === null || item_type_id === '') updateData.item_type_id = null;
    
    if (status !== undefined) updateData.status = status;
    if (is_sold !== undefined) updateData.is_sold = is_sold === 'true' || is_sold === true;
    
    // Location Updates
    if (req.body.lat !== undefined) updateData.lat = req.body.lat ? parseFloat(req.body.lat) : null;
    if (req.body.lng !== undefined) updateData.lng = req.body.lng ? parseFloat(req.body.lng) : null;
    if (req.body.location !== undefined) updateData.location = req.body.location;
    if (req.body.location_label !== undefined) updateData.location_label = req.body.location_label;
    if (req.body.country !== undefined) updateData.country = req.body.country;
    if (req.body.state !== undefined) updateData.state = req.body.state;
    if (req.body.city !== undefined) updateData.city = req.body.city;
    if (req.body.pincode !== undefined) updateData.pincode = req.body.pincode;
    
    if (req.body.currency_id) updateData.currency_id = req.body.currency_id;
    
    if (seo_title !== undefined) updateData.seo_title = seo_title;
    if (seo_description !== undefined) updateData.seo_description = seo_description;
    if (seo_keywords !== undefined) updateData.seo_keywords = seo_keywords;
    
    // Always update images if we processed them
    updateData.images = updatedImages;

    if (attributes !== undefined) {
        try {
            updateData.attributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
        } catch (e) {
            console.error("Error parsing attributes:", e);
        }
    }

    console.log('Update Data going to DB:', updateData);

    fs.appendFileSync(logPath, `Update Data: ${JSON.stringify(updateData)}\n`);

    try {
        Object.assign(item, updateData);
        const updatedItem = await item.save();
        
        const populatedItem = await Item.findById(updatedItem._id)
          .populate('category_id', 'name')
          .populate('subcategory_id', 'name')
          .populate('item_type_id', 'name')
          .populate('seller_id', 'username email profile_image rating_avg rating_count is_deleted status')
          .populate('currency_id', 'code symbol');

        fs.appendFileSync(logPath, `SUCCESS: Result Images Count=${populatedItem.images?.length}\n`);
        res.status(200).json(populatedItem);
    } catch (error) {
        fs.appendFileSync(logPath, `ERROR: ${error.message}\n`);
        throw error;
    }
});

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
const deleteItem = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Check for user
    if (!req.user) {
        res.status(401);
        throw new Error('User not found');
    }

    // Ensure logged in user matches the item seller
    if (item.seller_id.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    await item.deleteOne();

    res.status(200).json({ id: req.params.id });
});

// @desc    Apply a discount to an item (seller only)
// @route   PUT /api/items/:id/discount
// @access  Private
const applyDiscount = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id).populate('seller_id', 'username');

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    if (item.seller_id._id.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized to modify this item');
    }

    const { discounted_price } = req.body;
    const newPrice = parseFloat(discounted_price);

    if (isNaN(newPrice) || newPrice <= 0) {
        res.status(400);
        throw new Error('Invalid discounted price');
    }

    // The discounted price must be lower than the current price
    const basePrice = item.original_price > 0 ? item.original_price : item.price;

    if (newPrice >= basePrice) {
        res.status(400);
        throw new Error(`Discounted price must be lower than the original price (${basePrice})`);
    }

    // Save original_price if this is the first time applying a discount
    const originalPrice = item.original_price > 0 ? item.original_price : item.price;

    const updatedItem = await Item.findByIdAndUpdate(
        req.params.id,
        {
            price: newPrice,
            original_price: originalPrice,
            discount_prompt_sent: true // mark so cron doesn't send again
        },
        { new: true }
    );

    // Notify users who liked/favourited the item
    try {
        const Favorite = (await import('../models/Favorite.js')).default;
        const likers = await Favorite.find({ item_id: item._id }).select('user_id');
        const percentOff = Math.round(((originalPrice - newPrice) / originalPrice) * 100);

        for (const fav of likers) {
            await Notification.create({
                user_id: fav.user_id,
                title: `💸 Price drop on an item you liked!`,
                message: `"${item.title}" just dropped from ${originalPrice} to ${newPrice} — that's ${percentOff}% off!`,
                type: 'info',
                link: `/items/${item._id}`
            });
        }
    } catch (err) {
        console.error('Could not notify likers:', err.message);
    }

    res.status(200).json(updatedItem);
});

// @desc    Remove a discount from an item (restore original price)
// @route   DELETE /api/items/:id/discount
// @access  Private
const removeDiscount = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    if (item.seller_id.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized');
    }

    const updatedItem = await Item.findByIdAndUpdate(
        req.params.id,
        { price: item.original_price > 0 ? item.original_price : item.price, original_price: 0 },
        { new: true }
    );

    res.status(200).json(updatedItem);
});

export {
    getItems,
    getItemById,
    getSimilarItems,
    getMyItems,
    setItem,
    updateItem,
    deleteItem,
    applyDiscount,
    removeDiscount,
};

