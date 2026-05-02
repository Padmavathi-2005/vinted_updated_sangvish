import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import ItemType from '../models/ItemType.js';

/**
 * GET /api/categories
 * Returns all top-level categories
 */
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ is_active: true }).sort('sort_order');
        res.json(categories);
    } catch (error) {
        console.error('Error in getCategories:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/categories/full
 * Returns full tree: categories → subcategories → sub-subcategories
 * Used for mega-menu rendering
 */
const getFullCategoryTree = async (req, res) => {
    try {
        const categories = await Category.find({ is_active: true }).sort('sort_order').lean();

        for (const cat of categories) {
            const subcategories = await Subcategory.find({
                category_id: cat._id,
                is_active: true,
            }).sort('sort_order').lean();

            for (const sub of subcategories) {
                sub.items = await ItemType.find({
                    subcategory_id: sub._id,
                    is_active: true,
                }).sort('sort_order').lean();
            }

            cat.subcategories = subcategories;
        }

        res.json(categories);
    } catch (error) {
        console.error('❌ getFullCategoryTree Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/categories/:slug
 * Returns a single category with its subcategories and sub-subcategories
 */
const getCategoryBySlug = async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug, is_active: true }).lean();
        if (!category) return res.status(404).json({ message: 'Category not found' });

        const subcategories = await Subcategory.find({
            category_id: category._id,
            is_active: true,
        }).sort('sort_order').lean();

        for (const sub of subcategories) {
            sub.items = await ItemType.find({
                subcategory_id: sub._id,
                is_active: true,
            }).sort('sort_order').lean();
        }

        category.subcategories = subcategories;
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/categories/:categorySlug/:subcategorySlug
 * Returns a subcategory with its sub-subcategories
 */
const getSubcategoryBySlug = async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.categorySlug });
        if (!category) return res.status(404).json({ message: 'Category not found' });

        const subcategory = await Subcategory.findOne({
            category_id: category._id,
            slug: req.params.subcategorySlug,
            is_active: true,
        }).lean();
        if (!subcategory) return res.status(404).json({ message: 'Subcategory not found' });

        subcategory.items = await ItemType.find({
            subcategory_id: subcategory._id,
            is_active: true,
        }).sort('sort_order').lean();

        res.json(subcategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/categories
 */
const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Name required' });
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const category = await Category.create({ name, slug });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/categories/subcategories
 */
const createSubcategory = async (req, res) => {
    try {
        const { name, category_id } = req.body;
        if (!name || !category_id) return res.status(400).json({ message: 'Name and Category ID required' });
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const subcategory = await Subcategory.create({ name, slug, category_id });
        res.status(201).json(subcategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/categories/itemtypes
 */
const createItemType = async (req, res) => {
    try {
        const { name, category_id, subcategory_id } = req.body;
        if (!name || !category_id || !subcategory_id) return res.status(400).json({ message: 'Name, Category ID, and Subcategory ID required' });
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const itemType = await ItemType.create({ name, slug, category_id, subcategory_id });
        res.status(201).json(itemType);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { getCategories, getFullCategoryTree, getCategoryBySlug, getSubcategoryBySlug, createCategory, createSubcategory, createItemType };
