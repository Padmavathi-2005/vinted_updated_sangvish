import Page from '../models/Page.js';

// Get all pages
export const getPages = async (req, res) => {
    try {
        const pages = await Page.find().sort({ createdAt: -1 });
        res.status(200).json(pages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pages', error: error.message });
    }
};

// Get single page by slug
export const getPageBySlug = async (req, res) => {
    try {
        const page = await Page.findOne({ slug: req.params.slug });
        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }
        res.status(200).json(page);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching page', error: error.message });
    }
};

// Get single page by ID
export const getPageById = async (req, res) => {
    try {
        const page = await Page.findById(req.params.id);
        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }
        res.status(200).json(page);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching page', error: error.message });
    }
};

// Create a new page
export const createPage = async (req, res) => {
    try {
        const { title, slug, content, isActive } = req.body;

        const existingPage = await Page.findOne({ slug });
        if (existingPage) {
            return res.status(400).json({ message: 'Page with this slug already exists' });
        }

        const page = new Page({ title, slug, content, isActive });
        const savedPage = await page.save();
        res.status(201).json(savedPage);
    } catch (error) {
        res.status(500).json({ message: 'Error creating page', error: error.message });
    }
};

// Update an existing page
export const updatePage = async (req, res) => {
    try {
        const { title, slug, content, isActive } = req.body;

        const existingPage = await Page.findOne({ slug, _id: { $ne: req.params.id } });
        if (existingPage) {
            return res.status(400).json({ message: 'Page with this slug already exists' });
        }

        const updatedPage = await Page.findByIdAndUpdate(
            req.params.id,
            { title, slug, content, isActive },
            { new: true, runValidators: true }
        );

        if (!updatedPage) {
            return res.status(404).json({ message: 'Page not found' });
        }

        res.status(200).json(updatedPage);
    } catch (error) {
        res.status(500).json({ message: 'Error updating page', error: error.message });
    }
};

// Delete a page
export const deletePage = async (req, res) => {
    try {
        const deletedPage = await Page.findByIdAndDelete(req.params.id);
        if (!deletedPage) {
            return res.status(404).json({ message: 'Page not found' });
        }
        res.status(200).json({ message: 'Page deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting page', error: error.message });
    }
};
