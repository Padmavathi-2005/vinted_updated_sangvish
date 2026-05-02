import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Admin from '../models/Admin.js';




const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }

            next();
        } catch (error) {
            console.log(error);
            res.status(401);
            throw new Error('Not authorized');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const adminProtect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

            // For Admin, we check the role in the token or find in Admin collection
            if (decoded.role === 'admin') {

                const admin = await Admin.findById(decoded.id).select('-password_hash');

                if (!admin) {
                    console.error(`Admin Protect: Admin not found in DB for ID ${decoded.id}`);
                    res.status(401);
                    throw new Error('Not authorized as an admin, account no longer exists');
                }

                req.user = admin;
                req.user.role = 'admin';
                next();
            } else {
                console.error(`Admin Protect: Token has incorrect role: ${decoded.role}`);
                res.status(401);
                throw new Error('Not authorized as an admin');
            }
        } catch (error) {
            console.error(`Admin Protect Error: ${error.message}`);
            if (res.statusCode !== 401 && error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
                res.status(500);
            } else {
                res.status(401);
            }
            if (res.statusCode === 500) {
                throw new Error('Server temporarily unavailable due to DB load');
            } else if (res.statusCode === 401 && error.message.includes('account no longer exists')) {
                throw error; // Re-throw the exact error message
            } else {
                throw new Error('Not authorized: Invalid or expired token');
            }
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized: Access token missing');
    }
});

export { protect, adminProtect };
