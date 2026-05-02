import express from 'express';
import {
    getShippingCompanies,
    createShippingCompany,
    updateShippingCompany,
    deleteShippingCompany
} from '../controllers/shippingCompanyController.js';
import { adminProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(adminProtect, getShippingCompanies)
    .post(adminProtect, createShippingCompany);

router.route('/:id')
    .put(adminProtect, updateShippingCompany)
    .delete(adminProtect, deleteShippingCompany);

export default router;
