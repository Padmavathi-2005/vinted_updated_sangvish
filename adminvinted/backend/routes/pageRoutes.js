import express from 'express';
import {
    getPages,
    getPageBySlug,
    getPageById,
    createPage,
    updatePage,
    deletePage
} from '../controllers/pageController.js';

const router = express.Router();


router.get('/', getPages);
router.get('/:slug', getPageBySlug);
router.get('/id/:id', getPageById);
router.post('/', createPage);
router.put('/:id', updatePage);
router.delete('/:id', deletePage);

export default router;
