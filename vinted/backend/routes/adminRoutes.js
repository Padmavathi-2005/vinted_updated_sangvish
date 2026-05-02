import express from 'express';
import { adminProtect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
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
    getCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency,
    getLanguages,
    createLanguage,
    updateLanguage,
    deleteLanguage,
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
} from '../controllers/adminController.js';
import {
    getReportsAdmin,
    updateReportStatus,
    handleReportAction
} from '../controllers/reportController.js';
import {
    getSubscribers,
    updateSubscriber,
    deleteSubscriber,
} from '../controllers/newsletterController.js';

const router = express.Router();

router.post('/login', loginAdmin);

// Protected Admin Routes
router.use(adminProtect);

router.get('/verify', verifyAdmin);
router.get('/dashboard', getDashboardStats);
router.get('/seed-shipping', seedShippingCompanies);
router.get('/reports', getReports);

// User Management
router.get('/users', getUsers);
router.post('/users', upload.single('profile_image'), createUser);
router.put('/users/:id', upload.single('profile_image'), updateUser);
router.delete('/users/:id', deleteUser);

// Item Management
router.get('/items/options', getItemOptions);
router.get('/items', getItems);
router.post('/items', upload.array('images', 20), createItem);
router.put('/items/:id', upload.array('images', 20), updateItem);
router.delete('/items/:id', deleteItem);

// Category Management
router.get('/categories', getCategories);
router.post('/categories', upload.single('category_image'), createCategory);
router.put('/categories/:id', upload.single('category_image'), updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/subcategories', getSubcategories);
router.post('/subcategories', upload.single('category_image'), createSubcategory);
router.put('/subcategories/:id', upload.single('category_image'), updateSubcategory);
router.delete('/subcategories/:id', deleteSubcategory);

router.get('/item-types', getItemTypes);
router.post('/item-types', upload.single('category_image'), createItemType);
router.put('/item-types/:id', upload.single('category_image'), updateItemType);
router.delete('/item-types/:id', deleteItemType);

// Order Management
router.get('/orders', getOrders);
router.put('/orders/:id', updateOrderAdmin);
router.delete('/orders/:id', deleteOrder);

// Localization Management
router.get('/languages', getLanguages);
router.post('/languages', createLanguage);
router.put('/languages/:id', updateLanguage);
router.delete('/languages/:id', deleteLanguage);

router.get('/currencies', getCurrencies);
router.post('/currencies', createCurrency);
router.put('/currencies/:id', updateCurrency);
router.delete('/currencies/:id', deleteCurrency);

// Wallet & Transactions Management
router.get('/payment-methods', getPaymentMethods);
router.post('/payment-methods', createPaymentMethod);
router.put('/payment-methods/:id', updatePaymentMethod);
router.delete('/payment-methods/:id', deletePaymentMethod);

router.get('/transactions', getTransactions);

router.get('/withdrawal-requests', getWithdrawalRequests);
router.put('/withdrawal-requests/:id', updateWithdrawalRequest);

// Newsletter Management
router.get('/newsletter', getSubscribers);
router.patch('/newsletter/:id', updateSubscriber);
router.delete('/newsletter/:id', deleteSubscriber);

// Product Reports
router.get('/product-reports', getReportsAdmin);
router.put('/product-reports/:id/status', updateReportStatus);
router.post('/product-reports/:id/action', handleReportAction);

// Notifications
router.get('/notifications', getAdminNotifications);
router.get('/notifications/count', getAdminNotificationCount);
router.put('/notifications/read-all', markAllAdminNotificationsAsRead);
router.put('/notifications/:id/read', markNotificationAsRead);

export default router;
