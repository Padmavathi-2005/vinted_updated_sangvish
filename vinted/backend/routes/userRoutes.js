import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/profileUpload.js';
import optimizeImages from '../middleware/imageOptimizer.js';
const router = express.Router();
import {
    registerUser,
    loginUser,
    getMe,
    deleteAccount,
    updateUserProfile,
    getAllUsers,
    pingActivity,
    getPublicUser,
    updateCookieConsent,
    forgotPassword,
    sendSignupOTP,
    verifyOTP,
    resetPassword,
    checkUsername
} from '../controllers/userController.js';

router.post('/', registerUser);
router.post('/login', loginUser);
router.post('/forgotpassword', forgotPassword);
router.post('/send-signup-otp', sendSignupOTP);
router.post('/verify-otp', verifyOTP);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe);
router.get('/', protect, getAllUsers);
router.get('/check-username/:username', checkUsername);
router.get('/:id/public', getPublicUser);

router.put('/profile', protect, upload.single('profile_image'), optimizeImages, updateUserProfile);
router.patch('/ping', protect, pingActivity);
router.patch('/cookie-consent', protect, updateCookieConsent);
router.delete('/delete', protect, deleteAccount);

export default router;
