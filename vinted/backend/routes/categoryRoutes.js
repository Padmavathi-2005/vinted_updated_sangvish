import express from 'express';
const router = express.Router();
import {
    getCategories,
    getFullCategoryTree,
    getCategoryBySlug,
    getSubcategoryBySlug,
    createCategory,
    createSubcategory,
    createItemType,
} from '../controllers/categoryController.js';

// POST /api/categories/subcategories
router.post('/subcategories', createSubcategory);

// POST /api/categories/itemtypes
router.post('/itemtypes', createItemType);

// POST /api/categories
router.post('/', createCategory);

// GET /api/categories              → all top-level categories
router.get('/', getCategories);

// GET /api/categories/full         → full tree for mega-menu
router.get('/full', getFullCategoryTree);

// GET /api/categories/:slug        → single category + subcategories
router.get('/:slug', getCategoryBySlug);

// GET /api/categories/:categorySlug/:subcategorySlug
router.get('/:categorySlug/:subcategorySlug', getSubcategoryBySlug);

export default router;
