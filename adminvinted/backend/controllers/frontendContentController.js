import asyncHandler from 'express-async-handler';
import FrontendContent from '../models/FrontendContent.js';

// @desc    Get all frontend content for a specific language
// @route   GET /api/frontend-content/:lang
// @access  Public
export const getFrontendContentByLang = asyncHandler(async (req, res) => {
    const { lang } = req.params;
    const content = await FrontendContent.find();

    const localizedContent = {};
    content.forEach(item => {
        if (!localizedContent[item.section]) {
            localizedContent[item.section] = {};
        }
        localizedContent[item.section][item.key] = item.values.get(lang) || item.values.get('en') || '';
    });

    res.json(localizedContent);
});

// @desc    Get all frontend content keys and translations (for Admin)
// @route   GET /api/frontend-content/admin/all
// @access  Private (Admin)
export const getAllFrontendContentAdmin = asyncHandler(async (req, res) => {
    const content = await FrontendContent.find().sort({ section: 1, key: 1 });

    // Convert Mongoose Map to plain JS object so frontend can use bracket notation (item.values['en'])
    const serialized = content.map(item => ({
        _id: item._id,
        section: item.section,
        key: item.key,
        values: Object.fromEntries(item.values),  // Map -> { en: '...', fr: '...', ... }
        created_at: item.created_at,
        updated_at: item.updated_at,
    }));

    res.json(serialized);
});

// @desc    Update a specific content key
// @route   PUT /api/frontend-content/admin/update
// @access  Private (Admin)
export const updateFrontendContent = asyncHandler(async (req, res) => {
    const { section, key, values } = req.body;

    if (!section || !key || !values) {
        res.status(400);
        throw new Error('Please provide section, key and values');
    }

    let item = await FrontendContent.findOne({ section, key });

    if (item) {
        // Merge values
        const currentValues = item.values;
        Object.keys(values).forEach(lang => {
            currentValues.set(lang, values[lang]);
        });
        item.values = currentValues;
        await item.save();
    } else {
        item = await FrontendContent.create({
            section,
            key,
            values
        });
    }

    res.json(item);
});

// @desc    Bulk update content
// @route   PUT /api/frontend-content/admin/bulk-update
// @access  Private (Admin)
export const bulkUpdateFrontendContent = asyncHandler(async (req, res) => {
    const { contents } = req.body; // Array of { section, key, values }

    if (!Array.isArray(contents)) {
        res.status(400);
        throw new Error('Invalid input');
    }

    const results = [];
    for (const itemData of contents) {
        let item = await FrontendContent.findOne({ section: itemData.section, key: itemData.key });
        if (item) {
            item.values = itemData.values;
            await item.save();
        } else {
            item = await FrontendContent.create(itemData);
        }
        results.push(item);
    }

    res.json({ message: 'Bulk update successful', count: results.length });
});
