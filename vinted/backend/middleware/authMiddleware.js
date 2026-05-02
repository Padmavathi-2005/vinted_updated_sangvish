import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import fs from 'fs';

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

            fs.appendFileSync('auth_debug.log', `Auth attempt: id=${decoded.id}, path=${req.url}\n`);

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password_hash');

            if (!req.user) {
                fs.appendFileSync('auth_errors.log', `[${new Date().toISOString()}] User not found: id=${decoded.id}, path=${req.url}\n`);
                res.status(401);
                throw new Error('Not authorized, user not found');
            }

            next();
        } catch (error) {
            fs.appendFileSync('auth_errors.log', `[${new Date().toISOString()}] Auth error: ${error.message}, path=${req.url}, token=${token ? token.substring(0, 10) + '...' : 'none'}\n`);
            console.log(error);
            res.status(401);
            throw new Error('Not authorized');
        }
    }

    if (!token) {
        fs.appendFileSync('auth_errors.log', `[${new Date().toISOString()}] No token: path=${req.url}\n`);
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const optionalProtect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
            req.user = await User.findById(decoded.id).select('-password_hash');
            next();
        } catch (error) {
            next();
        }
    } else {
        next();
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
            res.status(401);
            throw new Error('Not authorized: Invalid or expired token');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized: Access token missing');
    }
});

const checkCookieConsent = asyncHandler(async (req, res, next) => {
    // If it's an API call, we don't block (frontend blocks the view)
    // But we could check a custom header if we really wanted to be strict.
    // For now, middleware is just defined to be used if needed.
    next();
});

export { protect, optionalProtect, adminProtect, checkCookieConsent };
