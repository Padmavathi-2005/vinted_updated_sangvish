import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Setting from '../models/Setting.js';
import Item from '../models/Item.js';
import Favorite from '../models/Favorite.js';
import Follow from '../models/Follow.js';
import Review from '../models/Review.js';
import SearchHistory from '../models/SearchHistory.js';
import UserPayoutMethod from '../models/UserPayoutMethod.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Order from '../models/Order.js';
import sendEmail from '../utils/sendEmail.js';
import verifyRecaptcha from '../utils/verifyRecaptcha.js';

const resolveMx = promisify(dns.resolveMx);

const checkEmailDomain = async (email) => {
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    // Set a 5s timeout to prevent hanging the request
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DNS Timeout')), 5000));
    
    try {
        const addresses = await Promise.race([resolveMx(domain), timeout]);
        return addresses && addresses.length > 0;
    } catch (err) {
        console.error('DNS MX check failed:', err.message);
        // If it's a timeout, maybe the domain is just slow, but we'll return false to be safe
        // Or return true if we want to be lenient on timeouts.
        return false;
    }
}

// @desc    Send Registration OTP
// @route   POST /api/users/send-signup-otp
// @access  Public
const sendSignupOTP = asyncHandler(async (req, res) => {
    const { email, captchaToken } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide an email');
    }

    // reCAPTCHA v3 Verification (if enabled)
    const isRecaptchaEnabled = process.env.RECAPTCHA_ENABLED === 'true' || 
                             (await Setting.findOne({ type: 'recaptcha_settings' }))?.recaptcha_enabled;
    if (isRecaptchaEnabled) {
        const captchaResult = await verifyRecaptcha(captchaToken);
        if (!captchaResult.success) {
            res.status(400);
            throw new Error(captchaResult.message || 'reCAPTCHA verification failed. Please try again.');
        }
        // Score threshold for registration security (0.3 is more permissive for localhost)
        if (captchaResult.score !== undefined && captchaResult.score < 0.3) {
            console.warn(`[reCAPTCHA] Bot suspected for user ${email || 'unknown'}. Score: ${captchaResult.score}`);
            res.status(403);
            throw new Error('An automated bot was detected during sign-up. Access denied.');
        }
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // REAL CHECK: DNS/MX record verification
    const isRealDomain = await checkEmailDomain(email);
    if (!isRealDomain) {
        res.status(400);
        throw new Error('The email domain does not appear to be real or cannot receive emails.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // We can't save to User yet because user doesn't exist.
    // We could use a Redis/Cache, or just return a temporary encrypted token containing the OTP.
    // For simplicity in this env, we'll return a special header or just have the frontend send it back.
    // Better: Send it and expect it back in the final registration.
    
    try {
        await sendEmail({
            email: email,
            subject: 'Verify your email for Vinted',
            message: `Your verification code is: ${otp}`,
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2>Welcome to Vinted!</h2>
                    <p>Use the code below to verify your email and complete your registration:</p>
                    <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0d6efd; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
                </div>
            `
        });

        // Generate a temporary signup token to verify the OTP later
        const signupToken = jwt.sign({ email, otp }, process.env.JWT_SECRET || 'secret123', { expiresIn: '10m' });

        res.status(200).json({ 
            success: true, 
            message: 'Verification code sent to email',
            signupToken // Frontend will send this back with the OTP
        });
    } catch (err) {
        console.error('Signup Email error:', err);
        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Register new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, first_name, last_name, otp, signupToken } = req.body;

    if (!username || !email || !password || !otp || !signupToken) {
        res.status(400);
        throw new Error('Please add all fields including verification code');
    }

    // Verify OTP
    try {
        const decoded = jwt.verify(signupToken, process.env.JWT_SECRET || 'secret123');
        if (decoded.email !== email || decoded.otp !== otp) {
            res.status(400);
            throw new Error('Invalid verification code or email mismatch');
        }
    } catch (err) {
        res.status(400);
        throw new Error('Verification code expired or invalid');
    }

    if (password.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password_hash: password,
        first_name: first_name || '',
        last_name: last_name || '',
        isEmailVerified: true
    });

    if (user) {
        const userName = user.display_name || (user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username);

        // 1. Send Welcome Notification to the User
        await Notification.create({
            user_id: user._id,
            on_model: 'User',
            title: 'Welcome!',
            message: `Hello ${userName}, thanks for joining us! We hope you have a great experience buying and selling.`,
            type: 'info',
            link: '/profile'
        });

        // 2. Notify Admin about the new user registration (Stored)
        const admins = await Admin.find({ is_active: true });
        for (const admin of admins) {
            await Notification.create({
                user_id: admin._id,
                on_model: 'Admin',
                title: 'New User Registered',
                message: `A new user ${userName} (${user.email}) has just registered.`,
                type: 'info',
                link: '/users'
            });
        }

        // 3. Send Welcome Message from Admin (System)
        try {
            const settings = await Setting.findOne({ type: 'general_settings' });
            const siteName = settings?.site_name || 'Vinted';
            // Get the plain string if it's a map/object
            const displaySiteName = typeof siteName === 'object' ? (Object.values(siteName)[0] || 'Vinted') : siteName;

            const welcomeAdmin = await Admin.findOne({ is_active: true });
            if (welcomeAdmin) {
                const welcomeText = `Hello ${userName}, welcome to ${displaySiteName}! 🌟 We're thrilled to have you join our community. Feel free to explore, buy, or start selling your items. If you need any help, we're here for you!`;
                
                const conversation = await Conversation.create({
                    participants: [
                        { user: welcomeAdmin._id, on_model: 'Admin' },
                        { user: user._id, on_model: 'User' }
                    ],
                    status: 'accepted',
                    initiator_id: welcomeAdmin._id,
                    initiator_model: 'Admin',
                    last_message: welcomeText,
                    last_message_at: Date.now(),
                });

                await Message.create({
                    conversation_id: conversation._id,
                    sender_id: welcomeAdmin._id,
                    sender_model: 'Admin',
                    receiver_id: user._id,
                    receiver_model: 'User',
                    message: welcomeText,
                    message_type: 'text'
                });

                // 3b. Send Notification to User for the Welcome Message
                await Notification.create({
                    user_id: user._id,
                    on_model: 'User',
                    title: `Welcome to ${displaySiteName}!`,
                    message: `You have a new message from our support team.`,
                    type: 'message',
                    link: '/profile?tab=messages'
                });
            }
        } catch (err) {
            console.error('Welcome message error:', err);
            // Don't fail the whole registration if welcome message fails
        }

        const userJSON = user.toJSON();
        userJSON.token = generateToken(user._id);
        userJSON.id = user._id;
        userJSON.name = user.display_name || (user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username);
        res.status(201).json(userJSON);
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password, captchaToken } = req.body;

    // reCAPTCHA v3 Verification (if enabled)
    const isRecaptchaEnabled = process.env.RECAPTCHA_ENABLED === 'true' || 
                             (await Setting.findOne({ type: 'recaptcha_settings' }))?.recaptcha_enabled;
    if (isRecaptchaEnabled) {
        const captchaResult = await verifyRecaptcha(captchaToken);
        if (!captchaResult.success) {
            res.status(400);
            throw new Error(captchaResult.message || 'reCAPTCHA verification failed. Please try again.');
        }
        // Score threshold for login security (0.3 is more permissive for localhost)
        if (captchaResult.score !== undefined && captchaResult.score < 0.3) {
            console.warn(`[reCAPTCHA] Bot suspected for user ${email || 'unknown'}. Score: ${captchaResult.score}`);
            res.status(403);
            throw new Error('An automated bot was detected. Access denied.');
        }
    }

    // Check for user email
    const user = await User.findOne({ email });

    if (!user) {
        res.status(400);
        throw new Error('User not found with this email');
    }

    if (await user.matchPassword(password)) {
        if (user.is_deleted) {
            res.status(403);
            throw new Error('Your account has been deleted. Please contact support to restore it.');
        }

        if (user.is_blocked) {
            res.status(403);
            throw new Error('Your account has been blocked.');
        }

        user.last_login = Date.now();
        await user.save();

        const userJSON = user.toJSON();
        userJSON.token = generateToken(user._id);
        userJSON.id = user._id;
        userJSON.name = user.username;
        res.json(userJSON);
    } else {
        res.status(400);
        throw new Error('Invalid password');
    }
});

// @desc    Soft delete account
// @route   DELETE /api/users/delete
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // 1. Safety Check: Balance
    if (user.balance > 0) {
        res.status(400);
        throw new Error(`You have a remaining balance of ${user.wallet_currency || 'EUR'} ${user.balance.toFixed(2)}. Please withdraw your funds before deleting your account.`);
    }

    // 2. Safety Check: Pending Orders
    const pendingOrders = await Order.findOne({
        $or: [{ buyer_id: user._id }, { seller_id: user._id }],
        status: { $in: ['pending', 'processing', 'shipped'] }
    });

    if (pendingOrders) {
        res.status(400);
        throw new Error('You cannot delete your account while you have active or pending orders. Please complete or cancel them first.');
    }

    // 3. SOFT DELETE for History Preservation
    // Instead of wiping everything, which breaks others' message history and order tracking,
    // we mark the user as deleted and blocked.
    const userId = user._id;

    // A. Soft Delete Products (Items) - unlist them
    await Item.updateMany({ seller_id: userId }, { status: 'inactive', is_deleted: true });

    // B. Keep Messages & Conversations for history, but the user is "gone"
    // Other users will see "Deleted User" based on the is_deleted flag in the user record.
    
    // C. Mark User as deleted/blocked
    user.is_deleted = true;
    user.is_blocked = true;
    user.email = `deleted_${userId}_${user.email}`; // Free up the email for reuse if desired
    user.username = `deleted_user_${userId.toString().slice(-6)}`;
    user.password_hash = 'DELETED_ACCOUNT_SECRET'; // Invalidate password
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ 
        success: true,
        message: 'Your account has been successfully closed. Your active listings have been removed.' 
    });
});

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    const userJSON = user.toJSON();
    userJSON.id = user._id;
    userJSON.username = user.username;
    userJSON.name = user.username;
    res.status(200).json(userJSON);
});

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const updateData = {};
    if (req.body.username) updateData.username = req.body.username;
    if (req.body.bio !== undefined) updateData.bio = req.body.bio;
    if (req.body.first_name !== undefined) updateData.first_name = req.body.first_name;
    if (req.body.last_name !== undefined) updateData.last_name = req.body.last_name;
    
    // Nested Address Update
    if (req.body.address) {
        updateData.address = typeof req.body.address === 'string' 
            ? JSON.parse(req.body.address) 
            : req.body.address;
    }

    if (req.body.bundle_discounts) {
        try {
            updateData.bundle_discounts = typeof req.body.bundle_discounts === 'string' 
                ? JSON.parse(req.body.bundle_discounts) 
                : req.body.bundle_discounts;
        } catch (e) {
            console.error("Error parsing bundle_discounts:", e);
        }
    }
    if (req.file) {
        updateData.profile_image = `images/profile/${req.file.filename}`;
    }
    if (req.body.password) {
        // We need the model for password hashing if we update directly, 
        // but findOneAndUpdate bypasses hooks. 
        // So we'll stick to the document method if password is being changed.
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }
        user.username = updateData.username || user.username;
        user.bio = updateData.bio !== undefined ? updateData.bio : user.bio;
        user.first_name = updateData.first_name !== undefined ? updateData.first_name : user.first_name;
        user.last_name = updateData.last_name !== undefined ? updateData.last_name : user.last_name;
        user.display_name = updateData.display_name !== undefined ? updateData.display_name : user.display_name;
        
        if (updateData.address) {
            user.address = { ...user.address, ...updateData.address };
        }

        user.profile_image = updateData.profile_image || user.profile_image;
        if (updateData.bundle_discounts) {
            user.bundle_discounts = updateData.bundle_discounts;
        }
        user.password_hash = req.body.password;

        const updatedUser = await user.save();
        const userJSON = updatedUser.toJSON();
        userJSON.token = generateToken(updatedUser._id);
        userJSON.id = updatedUser._id;
        userJSON.name = updatedUser.display_name || (updatedUser.first_name || updatedUser.last_name ? `${updatedUser.first_name} ${updatedUser.last_name}`.trim() : updatedUser.username);
        return res.json(userJSON);
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (updatedUser) {
        const userJSON = updatedUser.toJSON();
        userJSON.token = generateToken(updatedUser._id);
        userJSON.id = updatedUser._id;
        userJSON.name = updatedUser.display_name || (updatedUser.first_name || updatedUser.last_name ? `${updatedUser.first_name} ${updatedUser.last_name}`.trim() : updatedUser.username);
        res.json(userJSON);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Get all users (for community/chat)
// @route   GET /api/users
// @access  Private
const getAllUsers = asyncHandler(async (req, res) => {
    const admins = await Admin.find({ is_active: true })
        .select('name profile_image')
        .lean();

    const formattedAdmins = admins.map(a => ({
        ...a,
        username: 'Support Admin (' + a.name + ')',
        on_model: 'Admin'
    }));

    const users = await User.find({
        _id: { $ne: req.user._id },
        is_deleted: false,
        is_blocked: false
    })
        .select('username email profile_image bio rating_avg rating_count created_at last_login')
        .sort({ username: 1 })
        .lean();

    const formattedUsers = users.map(u => ({
        ...u,
        on_model: 'User'
    }));

    res.status(200).json([...formattedAdmins, ...formattedUsers]);
});

// @desc    Update last_login timestamp (keeps Last Seen accurate during active sessions)
// @route   PATCH /api/users/ping
// @access  Private
const pingActivity = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    user.last_login = new Date();
    await user.save();
    res.status(200).json({ last_login: user.last_login });
});

// @desc    Get a public user profile by ID (for Seller Profile page)
// @route   GET /api/users/:id/public
// @access  Public
const getPublicUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
        .select('username first_name last_name profile_image bio rating_avg rating_count created_at location is_deleted is_blocked');

    if (!user || user.is_deleted || user.is_blocked) {
        res.status(404);
        throw new Error('User not found or unavailable');
    }

    res.status(200).json(user);
});

// @desc    Update user cookie consent status
// @route   PATCH /api/users/cookie-consent
// @access  Private
const updateCookieConsent = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    user.cookie_consent = req.body.consent === true;
    await user.save();
    res.status(200).json({ message: 'Consent updated', cookie_consent: user.cookie_consent });
});

// @desc    Forgot Password - get email and send OTP
// @route   POST /api/users/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email, captchaToken } = req.body;

    // reCAPTCHA v3 Verification (if enabled)
    const isRecaptchaEnabled = process.env.RECAPTCHA_ENABLED === 'true' || 
                             (await Setting.findOne({ type: 'recaptcha_settings' }))?.recaptcha_enabled;
    if (isRecaptchaEnabled) {
        const captchaResult = await verifyRecaptcha(captchaToken);
        if (!captchaResult.success) {
            res.status(400);
            throw new Error(captchaResult.message || 'reCAPTCHA verification failed. Please try again.');
        }
        if (captchaResult.score !== undefined && captchaResult.score < 0.3) {
            console.warn(`[reCAPTCHA] Bot suspected for user ${email || 'unknown'}. Score: ${captchaResult.score}`);
            res.status(403);
            throw new Error('Automated activity detected. Access denied.');
        }
    }

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('There is no user with that email');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    const message = `Your password reset verification code is: ${otp}. This code will expire in 10 minutes.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Verification Code',
            message,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px; text-align: center;">
                    <h2 style="color: #333;">Verification Code</h2>
                    <p style="color: #666;">Use the following code to verify your password reset request:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0d6efd; margin: 20px 0; border-radius: 5px;">
                        ${otp}
                    </div>
                    <p style="color: #999; font-size: 13px;">This code is valid for 10 minutes. If you didn't request this, you can ignore this email.</p>
                </div>
            `
        });

        res.status(200).json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
        console.error('Email error:', err);
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpire = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Verify OTP and return reset token
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ 
        email,
        resetPasswordOTP: otp,
        resetPasswordOTPExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired verification code');
    }

    // Clear OTP and set a proper reset token for the final step
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Send the resetToken back to the frontend so it can use it for the final resetPassword call
    res.status(200).json({ 
        success: true, 
        message: 'OTP verified successfully',
        resetToken 
    });
});

// @desc    Reset password
// @route   PUT /api/users/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    // Get hashed token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset link');
    }

    // Set new password
    user.password_hash = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password reset successful'
    });
});

export {
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
    resetPassword
};
