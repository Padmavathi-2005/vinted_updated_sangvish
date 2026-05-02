import express from 'express';
import Setting from '../models/Setting.js';
import User from '../models/User.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as AppleStrategy } from 'passport-apple';
import jwt from 'jsonwebtoken';

const router = express.Router();

// A generic helper to dynamically get the proper host URL based on environment
const getHostUrl = (req) => {
    // If BACKEND_URL is provided in .env, use it as priority
    if (process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost')) {
        return process.env.BACKEND_URL.replace(/\/$/, ""); // Ensure no trailing slash
    }

    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    return isLocal
        ? `http://localhost:${process.env.PORT || 5000}`
        : `https://${req.get('host')}`;
};

// Common callback logic to handle user login/registration and status check
const handleSocialAuth = async (profile, done) => {
    try {
        // Detect email from different profile structures
        const email = profile.emails?.[0]?.value || profile.email || (profile._json && profile._json.email);
        
        if (!email) {
            return done(null, false, { message: 'No email provided by social network. Please ensure your account has a verified email.' });
        }

        let user = await User.findOne({ email });

        if (user) {
            // CRITICAL: Blocked/Deleted user check
            if (user.is_blocked) {
                return done(null, false, { message: 'Your account has been blocked.' });
            }
            if (user.is_deleted) {
                return done(null, false, { message: 'Your account has been deleted.' });
            }
            
            user.last_login = Date.now();
            await user.save();
        } else {
            // Auto-register if user doesn't exist
            user = await User.create({
                username: profile.displayName || profile.username || email.split('@')[0],
                email: email,
                password_hash: Math.random().toString(36).slice(-10), // Random dummy password
                isEmailVerified: true,
                profile_image: profile.photos?.[0]?.value || (profile._json && profile._json.picture) || ''
            });
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
};

// Dynamically configure and execute Passport for a specific provider
const authenticateProvider = (provider) => async (req, res, next) => {
    try {
        const settings = await Setting.findOne({ type: 'social_login_settings' });
        const isEnabled = settings?.[`${provider}_enabled`];

        if (!isEnabled) {
            return res.status(400).send(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login is not enabled.`);
        }

        let Strategy;
        let config = {
            callbackURL: `${getHostUrl(req)}/api/auth/${provider}/callback`,
        };

        if (provider === 'google') {
            Strategy = GoogleStrategy;
            config.clientID = settings.google_client_id;
            config.clientSecret = settings.google_client_secret;
        } else if (provider === 'facebook') {
            Strategy = FacebookStrategy;
            config.clientID = settings.facebook_client_id;
            config.clientSecret = settings.facebook_client_secret;
            config.profileFields = ['id', 'displayName', 'email', 'photos'];
        } else if (provider === 'twitter') {
            Strategy = TwitterStrategy;
            // passport-twitter uses OAuth 1.0a, requires consumerKey/consumerSecret
            config.consumerKey = settings.twitter_client_id;
            config.consumerSecret = settings.twitter_client_secret;
        } else if (provider === 'apple') {
            Strategy = AppleStrategy;
            config.clientID = settings.apple_client_id;
            config.teamID = settings.apple_team_id;
            config.keyID = settings.apple_key_id;
            config.privateKeyString = settings.apple_private_key;
        }

        if (!Strategy || (!config.clientID && !config.consumerKey)) {
            return res.status(400).send(`${provider.charAt(0).toUpperCase() + provider.slice(1)} configuration is incomplete in settings.`);
        }

        passport.use(new Strategy(config, (accessToken, refreshToken, profile, done) => {
            handleSocialAuth(profile, done);
        }));

        const options = { session: false };
        if (provider === 'google') options.scope = ['profile', 'email'];
        if (provider === 'facebook') options.scope = ['email'];
        // Twitter and Apple might need specific options if any

        passport.authenticate(provider, options)(req, res, next);
    } catch (err) {
        next(err);
    }
};

// Routes
router.get('/google', authenticateProvider('google'));
router.get('/facebook', authenticateProvider('facebook'));
router.get('/twitter', authenticateProvider('twitter'));
router.get('/apple', authenticateProvider('apple'));

// Callbacks
router.get('/:provider/callback', (req, res, next) => {
    const { provider } = req.params;
    
    // Some providers might need special callback handling
    passport.authenticate(provider, { session: false }, async (err, user, info) => {
        if (err || !user) {
            const message = info?.message || err?.message || 'Authentication failed';
            console.error(`Social Auth Error (${provider}):`, message);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(message)}`);
        }

        // Generate Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
        
        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?social_token=${token}`);
    })(req, res, next);
});

export default router;
