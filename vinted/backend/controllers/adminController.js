import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import asyncHandler from 'express-async-handler';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import ItemType from '../models/ItemType.js';
import Language from '../models/Language.js';
import Currency from '../models/Currency.js';
import Order from '../models/Order.js';
import PaymentMethod from '../models/PaymentMethod.js';
import Transaction from '../models/Transaction.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Notification from '../models/Notification.js';
import ShippingCompany from '../models/ShippingCompany.js';
import Wallet from '../models/Wallet.js';
import { getOrCreateWallet } from './walletController.js';


// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Private (Admin)
const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
    const { name, slug, description, icon, is_active } = req.body;
    const category = await Category.create({
        name,
        slug,
        description,
        icon,
        image: req.file ? `images/categories/${req.file.filename}` : '',
        is_active: is_active !== undefined ? (is_active === 'true' || is_active === true) : true
    });
    res.status(201).json(category);
});


// @desc    Update a category
// @route   PUT /api/admin/categories/:id
// @access  Private (Admin)
const updateCategory = asyncHandler(async (req, res) => {
    const { name, slug, description, icon, is_active } = req.body;
    const category = await Category.findById(req.params.id);

    if (category) {
        category.name = name || category.name;
        category.slug = slug || category.slug;
        category.description = description || category.description;
        category.icon = icon !== undefined ? icon : category.icon;
        if (is_active !== undefined) category.is_active = (is_active === 'true' || is_active === true);
        if (req.file) {
            category.image = `images/categories/${req.file.filename}`;
        }

        const updated = await category.save();
        res.json(updated);
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

// @desc    Delete a category
// @route   DELETE /api/admin/categories/:id
// @access  Private (Admin)
const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (category) {
        res.json({ message: 'Category removed' });
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

// @desc    Get all subcategories
// @route   GET /api/admin/subcategories
// @access  Private (Admin)
const getSubcategories = asyncHandler(async (req, res) => {
    const subcategories = await Subcategory.find({}).populate('category_id', 'name').sort({ name: 1 });
    res.json(subcategories);
});

const createSubcategory = asyncHandler(async (req, res) => {
    const { name, slug, category_id, is_active, description, icon } = req.body;
    const subcategory = await Subcategory.create({
        name,
        slug,
        category_id,
        description,
        icon,
        image: req.file ? `images/categories/${req.file.filename}` : '',
        is_active: is_active !== undefined ? (is_active === 'true' || is_active === true) : true
    });
    res.status(201).json(subcategory);
});

const updateSubcategory = asyncHandler(async (req, res) => {
    const { name, slug, category_id, is_active, description, icon } = req.body;
    const subcategory = await Subcategory.findById(req.params.id);
    if (subcategory) {
        subcategory.name = name || subcategory.name;
        subcategory.slug = slug || subcategory.slug;
        subcategory.category_id = category_id || subcategory.category_id;
        subcategory.description = description || subcategory.description;
        subcategory.icon = icon !== undefined ? icon : subcategory.icon;

        if (is_active !== undefined) subcategory.is_active = (is_active === 'true' || is_active === true);

        if (req.file) {
            subcategory.image = `images/categories/${req.file.filename}`;
        }

        const updated = await subcategory.save();
        res.json(updated);
    } else {
        res.status(404);
        throw new Error('Subcategory not found');
    }
});

const deleteSubcategory = asyncHandler(async (req, res) => {
    const subcategory = await Subcategory.findByIdAndDelete(req.params.id);
    if (subcategory) {
        res.json({ message: 'Subcategory removed' });
    } else {
        res.status(404);
        throw new Error('Subcategory not found');
    }
});

// @desc    Get all item types
// @route   GET /api/admin/item-types
// @access  Private (Admin)
const getItemTypes = asyncHandler(async (req, res) => {
    const itemTypes = await ItemType.find({}).populate('subcategory_id', 'name').sort({ name: 1 });
    res.json(itemTypes);
});

const createItemType = asyncHandler(async (req, res) => {
    console.log('--- createItemType called (MAIN BACKEND) ---');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    const { name, slug, subcategory_id, is_active, description, icon } = req.body;

    // Handle subcategory_id being passed as object string or actual object
    let subId = subcategory_id;
    if (subId && typeof subId === 'object' && subId._id) subId = subId._id;
    if (subId === '[object Object]') {
        console.error('CRITICAL: subcategory_id is "[object Object]"');
    }

    // Fetch subcategory to get its category_id
    const subcategory = await Subcategory.findById(subId);
    if (!subcategory) {
        console.error('Subcategory not found for ID:', subId);
        res.status(400).json({ message: 'Invalid subcategory ID provided' });
        return;
    }

    const itemType = await ItemType.create({
        name,
        slug,
        subcategory_id: subId,
        category_id: subcategory.category_id,
        description,
        icon,
        image: req.file ? `images/categories/${req.file.filename}` : '',
        is_active: is_active !== undefined ? (is_active === 'true' || is_active === true) : true
    });

    console.log('ItemType created successfully:', itemType._id);
    res.status(201).json(itemType);
});

const updateItemType = asyncHandler(async (req, res) => {
    console.log('--- updateItemType called (MAIN BACKEND) ---');
    console.log('ID:', req.params.id);
    console.log('Body:', req.body);
    console.log('File:', req.file);

    const { name, slug, subcategory_id, is_active, description, icon } = req.body;
    const itemType = await ItemType.findById(req.params.id);
    if (itemType) {
        itemType.name = name || itemType.name;
        itemType.slug = slug || itemType.slug;
        itemType.description = description || itemType.description;
        itemType.icon = icon !== undefined ? icon : itemType.icon;

        let subId = subcategory_id;
        if (subId && typeof subId === 'object' && subId._id) subId = subId._id;

        if (subId && subId !== '[object Object]' && subId !== itemType.subcategory_id.toString()) {
            const subcategory = await Subcategory.findById(subId);
            if (subcategory) {
                itemType.subcategory_id = subId;
                itemType.category_id = subcategory.category_id;
            }
        }

        if (is_active !== undefined) itemType.is_active = (is_active === 'true' || is_active === true);

        if (req.file) {
            console.log('Updating image to:', `images/categories/${req.file.filename}`);
            itemType.image = `images/categories/${req.file.filename}`;
        }

        const updated = await itemType.save();
        console.log('ItemType updated successfully');
        res.json(updated);
    } else {
        res.status(404).json({ message: 'Item type not found' });
    }
});

const deleteItemType = asyncHandler(async (req, res) => {
    const itemType = await ItemType.findByIdAndDelete(req.params.id);
    if (itemType) {
        res.json({ message: 'Item type removed' });
    } else {
        res.status(404);
        throw new Error('Item type not found');
    }
});


// @desc    Get all languages
// @route   GET /api/admin/languages
// @access  Private (Admin)
const getLanguages = asyncHandler(async (req, res) => {
    const languages = await Language.find({}).sort({ name: 1 });
    res.json(languages);
});

// @desc    Create a language
// @route   POST /api/admin/languages
// @access  Private (Admin)
const createLanguage = asyncHandler(async (req, res) => {
    const { name, code, native_name, direction, is_active } = req.body;
    const language = await Language.create({ name, code, native_name, direction, is_active });
    res.status(201).json(language);
});

// @desc    Update a language
// @route   PUT /api/admin/languages/:id
// @access  Private (Admin)
const updateLanguage = asyncHandler(async (req, res) => {
    const language = await Language.findById(req.params.id);
    if (language) {
        language.name = req.body.name || language.name;
        language.code = req.body.code || language.code;
        language.native_name = req.body.native_name || language.native_name;
        language.direction = req.body.direction || language.direction;
        if (req.body.is_active !== undefined) language.is_active = req.body.is_active;

        const updated = await language.save();
        res.json(updated);
    } else {
        res.status(404);
        throw new Error('Language not found');
    }
});

// @desc    Delete a language
// @route   DELETE /api/admin/languages/:id
// @access  Private (Admin)
const deleteLanguage = asyncHandler(async (req, res) => {
    const language = await Language.findByIdAndDelete(req.params.id);
    if (language) {
        res.json({ message: 'Language removed' });
    } else {
        res.status(404);
        throw new Error('Language not found');
    }
});

// @desc    Get all currencies
// @route   GET /api/admin/currencies
// @access  Private (Admin)
const getCurrencies = asyncHandler(async (req, res) => {
    const currencies = await Currency.find({}).sort({ name: 1 });
    res.json(currencies);
});

// @desc    Create a currency
// @route   POST /api/admin/currencies
// @access  Private (Admin)
const createCurrency = asyncHandler(async (req, res) => {
    const currency = await Currency.create(req.body);
    res.status(201).json(currency);
});

// @desc    Update a currency
// @route   PUT /api/admin/currencies/:id
// @access  Private (Admin)
const updateCurrency = asyncHandler(async (req, res) => {
    const currency = await Currency.findById(req.params.id);
    if (currency) {
        Object.assign(currency, req.body);
        const updated = await currency.save();
        res.json(updated);
    } else {
        res.status(404);
        throw new Error('Currency not found');
    }
});

// @desc    Delete a currency
// @route   DELETE /api/admin/currencies/:id
// @access  Private (Admin)
const deleteCurrency = asyncHandler(async (req, res) => {
    const currency = await Currency.findByIdAndDelete(req.params.id);
    if (currency) {
        res.json({ message: 'Currency removed' });
    } else {
        res.status(404);
        throw new Error('Currency not found');
    }
});

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for admin in the separate Admin collection
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    console.log(`Login attempt for: ${email}`);
    if (admin) {
        console.log(`Admin found for: ${email}`);
    } else {
        console.log(`Admin NOT found for: ${email}`);
    }

    if (admin && (await bcrypt.compare(password, admin.password_hash))) {
        res.json({
            _id: admin.id,
            name: admin.name,
            email: admin.email,
            token: generateToken(admin._id),
            role: 'admin'
        });
    } else {
        res.status(400);
        throw new Error('Invalid Admin credentials');
    }
});

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalUsers = await User.countDocuments();
    const todayUsers = await User.countDocuments({ created_at: { $gte: today } });

    const revenueAggr = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$total_amount" } } }]);
    const totalRevenue = revenueAggr.length > 0 ? revenueAggr[0].total : 0;

    const totalOrders = await Order.countDocuments();
    const todayOrders = await Order.countDocuments({ created_at: { $gte: today } });

    // Today Revenue
    const todayRevenueAggr = await Order.aggregate([
        { $match: { created_at: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$total_amount" } } }
    ]);
    const todayRevenue = todayRevenueAggr.length > 0 ? todayRevenueAggr[0].total : 0;

    const totalListings = await Item.countDocuments();
    const todayListings = await Item.countDocuments({ created_at: { $gte: today } });

    const totalCategories = await Category.countDocuments();

    // Content stats for front panels
    const pendingWithdrawals = await WithdrawalRequest.countDocuments({ status: 'pending' });
    const pendingItems = await Item.countDocuments({ status: 'pending' });

    // Commission transactions
    const commissionAggr = await Transaction.aggregate([
        { $match: { purpose: 'commission', type: 'credit' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalCommission = commissionAggr.length > 0 ? commissionAggr[0].total : 0;

    // Latest lists
    const latestOrders = await Order.find({})
        .sort({ created_at: -1 }).limit(5)
        .populate('buyer_id', 'username');

    const latestListings = await Item.find({})
        .sort({ created_at: -1 }).limit(5)
        .populate('seller_id', 'username');

    // Retrieve monthly sales for the last 12 months
    const pastYear = new Date();
    pastYear.setMonth(pastYear.getMonth() - 11);
    pastYear.setDate(1);
    pastYear.setHours(0, 0, 0, 0);

    const monthlySalesAggr = await Order.aggregate([
        { $match: { created_at: { $gte: pastYear } } },
        {
            $group: {
                _id: {
                    year: { $year: "$created_at" },
                    month: { $month: "$created_at" }
                },
                totalSales: { $sum: "$total_amount" },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Format into an array of 12 elements
    const monthlySales = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        const matched = monthlySalesAggr.find(m => m._id.year === d.getFullYear() && m._id.month === (d.getMonth() + 1));
        return {
            month: d.toLocaleString('default', { month: 'short' }),
            sales: matched ? matched.totalSales : 0,
            count: matched ? matched.count : 0
        };
    });

    const sellersArray = await Item.distinct('seller_id');
    const buyersArray = await Order.distinct('buyer_id');

    const topSellersAggr = await Order.aggregate([
        {
            $group: {
                _id: "$seller_id",
                totalSales: { $sum: "$total_amount" },
                ordersCount: { $sum: 1 }
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "sellerDetails"
            }
        },
        { $unwind: "$sellerDetails" },
        {
            $project: {
                _id: 1,
                totalSales: 1,
                ordersCount: 1,
                username: "$sellerDetails.username",
                profile_image: "$sellerDetails.profile_image"
            }
        }
    ]);

    const topBuyersAggr = await Order.aggregate([
        {
            $group: {
                _id: "$buyer_id",
                totalSpent: { $sum: "$total_amount" },
                ordersCount: { $sum: 1 }
            }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "buyerDetails"
            }
        },
        { $unwind: "$buyerDetails" },
        {
            $project: {
                _id: 1,
                totalSpent: 1,
                ordersCount: 1,
                username: "$buyerDetails.username",
                profile_image: "$buyerDetails.profile_image"
            }
        }
    ]);

    res.json({
        users: { total: totalUsers, today: todayUsers, buyers: buyersArray.length, sellers: sellersArray.length },
        revenue: { total: totalRevenue, today: todayRevenue, count: totalOrders, todayCount: todayOrders },
        property: { total: totalListings, today: todayListings },
        experience: { total: totalCategories, today: 0 },
        reservation: { total: totalOrders, today: todayOrders },
        commission: { total: totalCommission },
        content: {
            pendingWithdrawals,
            pendingItems,
            categories: totalCategories
        },
        latestBookings: latestOrders,
        latestProperties: latestListings,
        monthlySales: monthlySales,
        topSellers: topSellersAggr,
        topBuyers: topBuyersAggr,
    });
});

// @desc    Get detailed report data for Reports dashboard
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getReports = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let queryStartDate = new Date();
    queryStartDate.setMonth(queryStartDate.getMonth() - 11);
    queryStartDate.setDate(1);
    queryStartDate.setHours(0, 0, 0, 0);

    let queryEndDate = new Date();

    let isCustomRange = false;
    if (startDate) {
        queryStartDate = new Date(startDate);
        queryStartDate.setHours(0, 0, 0, 0);
        isCustomRange = true;
    }
    if (endDate) {
        queryEndDate = new Date(endDate);
        queryEndDate.setHours(23, 59, 59, 999);
        isCustomRange = true;
    }

    const matchQuery = { created_at: { $gte: queryStartDate, $lte: queryEndDate } };

    // 1. Revenue & Commission 
    const dateFormat = isCustomRange ? "%Y-%m-%d" : "%Y-%m";
    const monthlyDataAggr = await Order.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: { $dateToString: { format: dateFormat, date: "$created_at" } },
                totalSales: { $sum: "$total_amount" },
                commission: { $sum: "$platform_fee" },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const chartData = [];

    if (!isCustomRange) {
        // Default: Last 12 months empty fill
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const yyyy_mm = d.toISOString().substring(0, 7);
            const matched = monthlyDataAggr.find(m => m._id === yyyy_mm);
            chartData.push({
                dateLabel: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
                sales: matched ? matched.totalSales : 0,
                commission: matched ? matched.commission : 0,
                count: matched ? matched.count : 0
            });
        }
    } else {
        // Custom Date Range empty fill by day
        let currentIterDate = new Date(queryStartDate);
        while (currentIterDate <= queryEndDate) {
            const yyyy_mm_dd = currentIterDate.toISOString().substring(0, 10);
            const matched = monthlyDataAggr.find(m => m._id === yyyy_mm_dd);
            chartData.push({
                dateLabel: currentIterDate.toLocaleString('default', { month: 'short', day: 'numeric' }),
                sales: matched ? matched.totalSales : 0,
                commission: matched ? matched.commission : 0,
                count: matched ? matched.count : 0
            });
            currentIterDate.setDate(currentIterDate.getDate() + 1);
        }

        // If the date range was only exactly 1 day long, charting engines can't draw a line (only 1 point).
        // Let's insert a fake 0 point for the preceding day to give it a visible slope.
        if (chartData.length === 1) {
            const prevDay = new Date(queryStartDate);
            prevDay.setDate(prevDay.getDate() - 1);
            chartData.unshift({
                dateLabel: prevDay.toLocaleString('default', { month: 'short', day: 'numeric' }),
                sales: 0,
                commission: 0,
                count: 0
            });
        }
    }

    // 2. Top Sellers (Analyzed View)
    const topSellers = await Order.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: "$seller_id",
                totalSales: { $sum: "$total_amount" },
                platformFee: { $sum: "$platform_fee" },
                ordersCount: { $sum: 1 }
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 100 },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "sellerDetails"
            }
        },
        { $unwind: "$sellerDetails" },
        {
            $project: {
                _id: 1,
                totalSales: 1,
                platformFee: 1,
                ordersCount: 1,
                username: "$sellerDetails.username",
                email: "$sellerDetails.email",
                profile_image: "$sellerDetails.profile_image"
            }
        }
    ]);

    // 3. Location / Map Data (Group by combined string)
    const recentOrders = await Order.find(matchQuery)
        .sort({ created_at: -1 })
        .limit(100)
        .select('order_number total_amount shipping_address created_at');

    const ordersForMap = recentOrders.map(order => {
        const addr = order.shipping_address || {};
        const combinedString = [addr.city, addr.state, addr.country, addr.address_line]
            .filter(Boolean)
            .join(', ');
        return {
            _id: order._id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            addressFull: combinedString || "Unknown Location",
            date: order.created_at
        };
    });

    const bookingLocations = await Order.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: {
                    addressLine: "$shipping_address.address_line",
                    city: "$shipping_address.city",
                    state: "$shipping_address.state",
                    country: "$shipping_address.country"
                },
                bookings: { $sum: 1 },
                revenue: { $sum: "$total_amount" }
            }
        },
        { $sort: { bookings: -1 } },
        { $limit: 50 },
        {
            $project: {
                _id: 0,
                locationString: {
                    $concat: [
                        { $ifNull: ["$_id.city", ""] }, ", ",
                        { $ifNull: ["$_id.state", ""] }, ", ",
                        { $ifNull: ["$_id.country", ""] }, " ",
                        { $ifNull: ["$_id.addressLine", ""] }
                    ]
                },
                bookings: 1,
                revenue: 1
            }
        }
    ]);

    // clean up leading/trailing commas
    bookingLocations.forEach(loc => {
        loc.locationString = loc.locationString.replace(/^[\s,]+/, '').replace(/[\s,]+$/, '') || "Unknown Address";
    });

    res.json({
        chartData,
        topSellers,
        bookingLocations,
        recentOrders: ordersForMap
    });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = asyncHandler(async (req, res) => {
    const { type } = req.query; // 'all', 'seller', 'buyer', 'active'
    let query = {};

    if (type === 'seller') {
        const sellersArray = await Item.distinct('seller_id');
        query = { _id: { $in: sellersArray } };
    } else if (type === 'buyer') {
        const buyersArray = await Order.distinct('buyer_id');
        query = { _id: { $in: buyersArray } };
    } else if (type === 'active') {
        query = { is_blocked: false };
    } else if (type === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        query = { created_at: { $gte: startOfDay } };
    }

    const users = await User.find(query).sort({ created_at: -1 });
    res.json(users);
});

// @desc    Create a user
// @route   POST /api/admin/users
// @access  Private (Admin)
const createUser = asyncHandler(async (req, res) => {
    const { username, email, password, status, balance, bio, rating_avg, rating_count, followers_count, following_count } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        username,
        email,
        password_hash: password,
        is_blocked: status === 'Inactive' || status === 'Banned',
        profile_image: req.file ? `images/profile/${req.file.filename}` : '',
        balance: balance || 0,
        bio: bio || '',
        rating_avg: rating_avg || 0,
        rating_count: rating_count || 0,
        followers_count: followers_count || 0,
        following_count: following_count || 0,
    });

    if (user) {
        // Correcting balance on Wallet as well if initial balance provided
        if (balance) {
            const wallet = await getOrCreateWallet(user._id, 'User');
            wallet.balance = balance;
            await wallet.save();
        }
        res.status(201).json(user);
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = asyncHandler(async (req, res) => {
    const { username, email, status, password, is_deleted, balance, bio, rating_avg, rating_count, followers_count, following_count } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    user.username = username || user.username;
    user.email = email || user.email;

    if (status !== undefined) {
        const wantsBlock = (status === 'Inactive' || status === 'Banned' || status === 'true');
        if (user.is_blocked !== wantsBlock) {
            user.is_blocked = wantsBlock;
            // Also update all items for this user to be inactive if they are blocked
            if (wantsBlock) {
                await Item.updateMany({ seller_id: user._id, status: 'active' }, { status: 'inactive' });
            }
        }
    }

    if (req.body.is_verified !== undefined) {
        user.is_verified = (req.body.is_verified === 'true' || req.body.is_verified === true);
    }

    if (balance !== undefined) user.balance = balance;
    if (bio !== undefined) user.bio = bio;
    if (rating_avg !== undefined) user.rating_avg = rating_avg;
    if (rating_count !== undefined) user.rating_count = rating_count;
    if (followers_count !== undefined) user.followers_count = followers_count;
    if (following_count !== undefined) user.following_count = following_count;

    if (req.file) {
        user.profile_image = `images/profile/${req.file.filename}`;
    }

    if (password) {
        user.password_hash = password;
    }

    const updatedUser = await user.save();
    
    // Sync Wallet Balance if balance was specifically updated
    if (balance !== undefined) {
        const wallet = await Wallet.findOne({ owner_id: updatedUser._id, owner_type: 'User' });
        if (wallet) {
            wallet.balance = Number(balance);
            await wallet.save();
        } else {
            // Create wallet if didn't exist (though should exist normally)
            await Wallet.create({
                owner_id: updatedUser._id,
                owner_type: 'User',
                balance: Number(balance)
            });
        }
    }

    res.json(updatedUser);
});

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.json({ message: 'User deleted' });
});

// @desc    Verify admin token
// @route   GET /api/admin/verify
// @access  Private (Admin)
const verifyAdmin = asyncHandler(async (req, res) => {
    // If they reached here, adminProtect passed
    res.json({
        success: true,
        admin: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: 'admin'
        }
    });
});

// @desc    Get all items
// @route   GET /api/admin/items
// @access  Private (Admin)
const getItems = asyncHandler(async (req, res) => {
    try {
        const { type } = req.query;
        let query = {};
        if (type === 'today') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            query = { created_at: { $gte: startOfDay } };
        }

        const items = await Item.find(query)
            .populate('seller_id', 'username email')
            .populate('category_id', 'name')
            .populate('subcategory_id', 'name')
            .sort({ created_at: -1 });

        console.log(`[Admin] Fetched ${items.length} items from database.`);
        res.json(items);
    } catch (error) {
        console.error("[Admin] Error in getItems API:", error);
        res.status(500).json({ message: "Failed to fetch items", error: error.message });
    }
});

// @desc    Get categories, subcategories and item types for dropdowns
// @route   GET /api/admin/items/options
// @access  Private (Admin)
const getItemOptions = asyncHandler(async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ name: 1 });
        const subcategories = await Subcategory.find({}).sort({ name: 1 });
        const itemTypes = await ItemType.find({}).sort({ name: 1 });

        res.json({ categories, subcategories, itemTypes });
    } catch (error) {
        console.error("[Admin] Error in getItemOptions API:", error);
        res.status(500).json({ message: "Failed to fetch item options", error: error.message });
    }
});

// @desc    Create an item
// @route   POST /api/admin/items
// @access  Private (Admin)
const createItem = asyncHandler(async (req, res) => {
    const { 
        title, price, description, brand, condition, status,
        category_id, subcategory_id, item_type_id, seller_id, currency_id 
    } = req.body;

    // Robust validation for required fields
    if (!title || !price || !category_id || !subcategory_id) {
        res.status(400);
        throw new Error('Please provide title, price, category, and subcategory');
    }

    // Default currency if none provided
    let finalCurrencyId = currency_id;
    if (!finalCurrencyId || finalCurrencyId === 'null' || finalCurrencyId === '') {
        const defaultCurrency = await Currency.findOne({ is_active: true }) || await Currency.findOne();
        finalCurrencyId = defaultCurrency ? defaultCurrency._id : null;
    }

    // Handle Images
    let itemImages = [];
    if (req.files && req.files.length > 0) {
        itemImages = req.files.map(file => `images/items/${file.filename}`);
    }

    try {
        const item = await Item.create({
            title,
            price: parseFloat(price),
            description: description || 'Created by Admin',
            brand: brand || '',
            condition: condition || 'New',
            status: status || 'active',
            seller_id: (seller_id && seller_id !== 'null') ? seller_id : req.user._id,
            category_id,
            subcategory_id,
            item_type_id: (item_type_id && item_type_id !== '' && item_type_id !== 'null') ? item_type_id : null,
            currency_id: finalCurrencyId,
            images: itemImages,
            original_price: parseFloat(price)
        });

        res.status(201).json(item);
    } catch (error) {
        console.error("[Admin Create Item] Error:", error.name, "-", error.message);
        res.status(500);
        throw error;
    }
});

// @desc    Update an item
// @route   PUT /api/admin/items/:id
// @access  Private (Admin)
const updateItem = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    const { 
        title, price, description, brand, condition, status, is_deleted, 
        category_id, subcategory_id, item_type_id, existingImages, existing_images, seller_id, currency_id
    } = req.body;

    const actualExistingImages = existingImages || existing_images;

    if (title !== undefined) item.title = title;
    if (price !== undefined) item.price = parseFloat(price);
    if (description !== undefined) item.description = description;
    if (brand !== undefined) item.brand = brand;
    if (condition !== undefined) item.condition = condition;

    if (status) {
        const newStatus = status.toLowerCase();
        // If they are trying to activate the item, verify the seller isn't banned
        if (newStatus === 'active') {
            const seller = await User.findById(item.seller_id);
            if (seller && seller.is_blocked) {
                res.status(400);
                throw new Error('Cannot activate item. The seller is blocked/inactive.');
            }
        }
        item.status = newStatus;
    }

    if (is_deleted !== undefined) {
        item.is_deleted = is_deleted === 'true' || is_deleted === true;
    }

    if (category_id && category_id !== '' && category_id !== 'null') item.category_id = category_id;
    if (subcategory_id && subcategory_id !== '' && subcategory_id !== 'null') item.subcategory_id = subcategory_id;
    if (item_type_id !== undefined) item.item_type_id = (item_type_id && item_type_id !== '' && item_type_id !== 'null') ? item_type_id : null;
    if (seller_id && seller_id !== '' && seller_id !== 'null') item.seller_id = seller_id;
    if (currency_id && currency_id !== '' && currency_id !== 'null') item.currency_id = currency_id;

    // Handle Images
    let updatedImages = [];
    if (actualExistingImages !== undefined) {
        try {
            const parsedExisting = typeof actualExistingImages === 'string' ? JSON.parse(actualExistingImages) : actualExistingImages;
            if (Array.isArray(parsedExisting)) {
                updatedImages = parsedExisting.map(img => {
                    if (typeof img !== 'string') return img;
                    // Robust normalization: extract only the filename or the relative path
                    if (img.includes('images/items/')) {
                        return img.substring(img.indexOf('images/items/'));
                    }
                    const parts = img.split('/');
                    const filename = parts[parts.length - 1];
                    return `images/items/${filename}`;
                });
            }
        } catch (e) {
            console.error("Error parsing existingImages in Admin:", e);
        }
    }

    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => `images/items/${file.filename}`);
        updatedImages = [...updatedImages, ...newImages];
    }

    // Only update images if we have something or existingImages was explicitly sent
    if (actualExistingImages !== undefined || (req.files && req.files.length > 0)) {
        item.images = updatedImages;
    }

    try {
        const updatedItem = await item.save();
        res.json(updatedItem);
    } catch (error) {
        console.error("[Admin Update Item] Error:", error.name, "-", error.message);
        res.status(500);
        throw error;
    }
});

// @desc    Delete an item
// @route   DELETE /api/admin/items/:id
// @access  Private (Admin)
const deleteItem = asyncHandler(async (req, res) => {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }
    res.json({ message: 'Item removed' });
});

const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || 'secret123';
    console.log('Generating token with secret:', secret === 'secret123' ? 'FALLBACK' : 'CUSTOM');

    // Ensure id is a string for the JWT payload
    return jwt.sign({ id: id.toString(), role: 'admin' }, secret, {
        expiresIn: '30d',
    });
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getOrders = asyncHandler(async (req, res) => {
    const { type } = req.query;
    let query = {};
    if (type === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        query = { created_at: { $gte: startOfDay } };
    }

    const orders = await Order.find(query)
        .populate('buyer_id', 'username email profile_image')
        .populate('seller_id', 'username email profile_image')
        .populate('item_id', 'title images')
        .sort({ created_at: -1 });

    res.json(orders);
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id
// @access  Private (Admin)
const updateOrderAdmin = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (req.body.order_status) {
        order.order_status = req.body.order_status;
    }
    if (req.body.payment_status) {
        order.payment_status = req.body.payment_status;
    }
    if (req.body.tracking_number !== undefined) {
        order.tracking_number = req.body.tracking_number;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
});

// @desc    Delete an order
// @route   DELETE /api/admin/orders/:id
// @access  Private (Admin)
const deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }
    res.json({ message: 'Order removed' });
});

// WALLET & TRANSACTIONS

// @desc    Get all payment methods
// @route   GET /api/admin/payment-methods
// @access  Private (Admin)
const getPaymentMethods = asyncHandler(async (req, res) => {
    const methods = await PaymentMethod.find({}).sort({ sort_order: 1 });

    // Normalize localized fields if they are still strings in the DB
    const normalizedMethods = methods.map(m => {
        const obj = m.toObject();
        if (obj.name && typeof obj.name === 'string') {
            obj.name = { en: obj.name };
        }
        if (obj.description && typeof obj.description === 'string') {
            obj.description = { en: obj.description };
        }
        return obj;
    });

    res.json(normalizedMethods);
});

const createPaymentMethod = asyncHandler(async (req, res) => {
    const method = await PaymentMethod.create(req.body);
    res.status(201).json(method);
});

const updatePaymentMethod = asyncHandler(async (req, res) => {
    const method = await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!method) {
        res.status(404);
        throw new Error('Payment method not found');
    }
    res.json(method);
});

const deletePaymentMethod = asyncHandler(async (req, res) => {
    const method = await PaymentMethod.findByIdAndDelete(req.params.id);
    if (!method) {
        res.status(404);
        throw new Error('Payment method not found');
    }
    res.json({ message: 'Payment method removed' });
});

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private (Admin)
const getTransactions = asyncHandler(async (req, res) => {
    const transactions = await Transaction.find({})
        .populate('user_id', 'username email')
        .sort({ created_at: -1 });
    res.json(transactions);
});

// @desc    Get all withdrawal requests
// @route   GET /api/admin/withdrawal-requests
// @access  Private (Admin)
const getWithdrawalRequests = asyncHandler(async (req, res) => {
    const requests = await WithdrawalRequest.find({})
        .populate('user_id', 'username email')
        .sort({ created_at: -1 });
    res.json(requests);
});

const updateWithdrawalRequest = asyncHandler(async (req, res) => {
    const { status, admin_note } = req.body;
    const request = await WithdrawalRequest.findById(req.params.id);

    if (!request) {
        res.status(404);
        throw new Error('Request not found');
    }

    // Capture old status
    const oldStatus = request.status;
    
    // Update the request
    request.status = status || request.status;
    request.admin_note = admin_note || request.admin_note;
    request.processed_at = new Date();
    request.processed_by = req.user._id;

    await request.save();

    // 1. Sync Transaction status
    const transaction = await Transaction.findOne({
        reference_id: request._id,
        reference_model: 'WithdrawalRequest'
    });

    if (transaction) {
        if (request.status === 'completed' || request.status === 'approved') {
            transaction.status = 'completed';
        } else if (request.status === 'rejected') {
            transaction.status = 'failed';
        }
        await transaction.save();
    }

    // 2. Handle Refund if rejected (if it wasn't already rejected)
    if (request.status === 'rejected' && oldStatus !== 'rejected') {
        const wallet = await Wallet.findOne({ owner_id: request.user_id, owner_type: 'User' });
        if (wallet) {
            wallet.balance += request.amount;
            await wallet.save();

            // Create a refund transaction
            await Transaction.create({
                user_id: request.user_id,
                user_type: 'User',
                wallet_id: wallet._id,
                amount: request.amount,
                type: 'credit',
                purpose: 'refund',
                reference_id: request._id,
                reference_model: 'WithdrawalRequest',
                status: 'completed',
                description: `Refund for rejected withdrawal request #${request._id.toString().slice(-6).toUpperCase()}`
            });
            
            // Also update User model balance if redundant
            await User.findByIdAndUpdate(request.user_id, { $inc: { balance: request.amount } });
        }
    }

    // 3. Notify User
    if (request.status !== oldStatus) {
        let msg = '';
        if (request.status === 'completed' || request.status === 'approved') {
            msg = `Your withdrawal request for ${request.currency} ${request.amount} has been approved.`;
        } else if (request.status === 'rejected') {
            msg = `Your withdrawal request for ${request.currency} ${request.amount} was rejected. Funds have been returned to your wallet.`;
        }

        if (msg) {
            await Notification.create({
                user_id: request.user_id,
                on_model: 'User',
                title: 'Withdrawal Update',
                message: msg,
                type: 'info',
                link: '/profile?tab=wallet'
            });
        }
    }

    res.json(request);
});


// @desc    Get admin notifications (Combined DB + Dynamic)
// @route   GET /api/admin/notifications
// @access  Private (Admin)
const getAdminNotifications = asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;
    const notifications = [];

    // 1. Fetch from Notification Collection (Specifically for this Admin)
    const dbNotifs = await Notification.find({ 
        user_id: req.user._id, 
        on_model: 'Admin' 
    })
        .sort({ created_at: -1 })
        .limit(Number(limit));

    dbNotifs.forEach(n => {
        const obj = n.toObject ? n.toObject() : n;
        notifications.push(obj);
    });

    // Sort list by date (already sorted from DB, but keeping for safety if we add other sources)
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(notifications.slice(0, Number(limit)));
});

// @desc    Get admin notification count
// @route   GET /api/admin/notifications/count
// @access  Private (Admin)
const getAdminNotificationCount = asyncHandler(async (req, res) => {
    const dbCount = await Notification.countDocuments({ 
        user_id: req.user._id, 
        on_model: 'Admin',
        is_read: false 
    });
    res.json({ count: dbCount });
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.json({ message: 'Notification skipped' });
    }

    const notification = await Notification.findByIdAndUpdate(
        id,
        { is_read: true },
        { new: true }
    );

    if (notification) {
        res.json({ message: 'Notification marked as read' });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Mark all admin notifications as read
// @route   PUT /api/admin/notifications/read-all
// @access  Private (Admin)
const markAllAdminNotificationsAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { is_read: false },
        { is_read: true }
    );
    res.json({ message: 'All notifications marked as read' });
});

const seedShippingCompanies = asyncHandler(async (req, res) => {
    const companies = [
        {
            company_name: 'DHL',
            tracking_url: 'https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=%tracking_id%',
            status: 'active'
        },
        {
            company_name: 'FedEx',
            tracking_url: 'https://www.fedex.com/fedextrack/?trknbr=%tracking_id%',
            status: 'active'
        },
        {
            company_name: 'UPS',
            tracking_url: 'https://www.ups.com/track?loc=en_US&tracknum=%tracking_id%',
            status: 'active'
        },
        {
            company_name: 'USPS',
            tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=%tracking_id%',
            status: 'active'
        }
    ];

    for (const company of companies) {
        await ShippingCompany.findOneAndUpdate(
            { company_name: company.company_name },
            company,
            { upsert: true, new: true }
        );
    }

    res.json({ message: 'Shipping companies seeded successfully' });
});

export {
    loginAdmin,
    getDashboardStats,
    getReports,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    verifyAdmin,
    getItems,
    getItemOptions,
    createItem,
    updateItem,
    deleteItem,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getSubcategories,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    getItemTypes,
    createItemType,
    updateItemType,
    deleteItemType,
    getLanguages,
    createLanguage,
    updateLanguage,
    deleteLanguage,
    getCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency,
    getOrders,
    updateOrderAdmin,
    deleteOrder,
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    getTransactions,
    getWithdrawalRequests,
    updateWithdrawalRequest,
    getAdminNotifications,
    getAdminNotificationCount,
    markNotificationAsRead,
    markAllAdminNotificationsAsRead,
    seedShippingCompanies
};
