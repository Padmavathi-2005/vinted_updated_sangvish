import express from 'express';
import { getMyWallet } from '../controllers/walletController.js';
import { requestWithdrawal, getMyWithdrawals, getMyPayoutMethods, createPayoutMethod, updatePayoutMethod, deletePayoutMethod, setDefaultPayoutMethod } from '../controllers/withdrawalController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/me', protect, getMyWallet);
router.post('/withdraw', protect, requestWithdrawal);
router.get('/withdrawals', protect, getMyWithdrawals);

router.get('/payout-methods', protect, getMyPayoutMethods);
router.post('/payout-methods', protect, createPayoutMethod);
router.put('/payout-methods/:id', protect, updatePayoutMethod);
router.delete('/payout-methods/:id', protect, deletePayoutMethod);
router.put('/payout-methods/:id/default', protect, setDefaultPayoutMethod);

export default router;
