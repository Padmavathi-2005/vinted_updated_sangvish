import asyncHandler from 'express-async-handler';
import ShippingCompany from '../models/ShippingCompany.js';

// @desc    Get all shipping companies
// @route   GET /api/shipping-companies
// @access  Private/Admin
export const getShippingCompanies = asyncHandler(async (req, res) => {
    const companies = await ShippingCompany.find({}).sort({ created_at: -1 });
    res.json(companies);
});

// @desc    Create a shipping company
// @route   POST /api/shipping-companies
// @access  Private/Admin
export const createShippingCompany = asyncHandler(async (req, res) => {
    const { company_name, tracking_url, logo, status } = req.body;

    const companyExists = await ShippingCompany.findOne({ company_name });

    if (companyExists) {
        res.status(400);
        throw new Error('Shipping company already exists');
    }

    const company = await ShippingCompany.create({
        company_name,
        tracking_url,
        logo,
        status: status || 'active'
    });

    res.status(201).json(company);
});

// @desc    Update a shipping company
// @route   PUT /api/shipping-companies/:id
// @access  Private/Admin
export const updateShippingCompany = asyncHandler(async (req, res) => {
    const company = await ShippingCompany.findById(req.params.id);

    if (company) {
        company.company_name = req.body.company_name || company.company_name;
        company.tracking_url = req.body.tracking_url || company.tracking_url;
        company.logo = req.body.logo || company.logo;
        company.status = req.body.status || company.status;

        const updatedCompany = await company.save();
        res.json(updatedCompany);
    } else {
        res.status(404);
        throw new Error('Shipping company not found');
    }
});

// @desc    Delete a shipping company
// @route   DELETE /api/shipping-companies/:id
// @access  Private/Admin
export const deleteShippingCompany = asyncHandler(async (req, res) => {
    const company = await ShippingCompany.findById(req.params.id);

    if (company) {
        await company.deleteOne();
        res.json({ message: 'Shipping company removed' });
    } else {
        res.status(404);
        throw new Error('Shipping company not found');
    }
});
