import asyncHandler from 'express-async-handler';
import PaymentMethod from '../models/PaymentMethod.js';
import Stripe from 'stripe';

import Setting from '../models/Setting.js';
import Order from '../models/Order.js';

let stripe_instance;
let current_key;

const getStripe = (secretKey) => {
    const key = secretKey || process.env.STRIPE_SECRET_KEY;
    if (!key) return null;

    if (!stripe_instance || current_key !== key) {
        stripe_instance = new Stripe(key);
        current_key = key;
    }
    return stripe_instance;
};

// @desc    Get all enabled payment methods
// @route   GET /api/payment-methods
// @access  Public
const getPaymentMethods = asyncHandler(async (req, res) => {
    // 1. Fetch custom payment methods from DB
    const dbMethods = await PaymentMethod.find({ is_active: true }).sort('sort_order');
    
    // 2. Fetch gateway settings
    const setting = await Setting.findOne({ type: 'payment_settings' });
    
    let methods = [...dbMethods];
    
    if (setting) {
        // Stripe Sync
        if (setting.stripe_enabled) {
            const stripeIdx = methods.findIndex(m => m.key === 'stripe');
            const stripeData = {
                key: 'stripe',
                is_active: true,
                // Transform translations to Map format {en: '...', ...}
                name: {},
                description: {}
            };
            
            // Map settings-style translations to model-style
            if (setting.stripe_translations) {
                Object.keys(setting.stripe_translations).forEach(lang => {
                    if (setting.stripe_translations[lang].name) {
                        stripeData.name[lang] = setting.stripe_translations[lang].name;
                    }
                    if (setting.stripe_translations[lang].description) {
                        stripeData.description[lang] = setting.stripe_translations[lang].description;
                    }
                });
            }
            
            // Fallback to default name if no translations provide one
            if (Object.keys(stripeData.name).length === 0) {
                stripeData.name = { en: 'Credit / Debit Card' };
            }

            if (stripeIdx === -1) {
                methods.push(stripeData);
            } else {
                // Merge/Override
                methods[stripeIdx] = { ...methods[stripeIdx].toObject(), ...stripeData };
            }
        } else {
            // Explicitly remove if disabled in settings
            methods = methods.filter(m => m.key !== 'stripe');
        }

        // PayPal Sync
        if (setting.paypal_enabled) {
            const paypalIdx = methods.findIndex(m => m.key === 'paypal');
            const paypalData = {
                key: 'paypal',
                is_active: true,
                name: {},
                description: {}
            };
            
            if (setting.paypal_translations) {
                Object.keys(setting.paypal_translations).forEach(lang => {
                    if (setting.paypal_translations[lang].name) {
                        paypalData.name[lang] = setting.paypal_translations[lang].name;
                    }
                    if (setting.paypal_translations[lang].description) {
                        paypalData.description[lang] = setting.paypal_translations[lang].description;
                    }
                });
            }

            if (Object.keys(paypalData.name).length === 0) {
                paypalData.name = { en: 'PayPal' };
            }

            if (paypalIdx === -1) {
                methods.push(paypalData);
            } else {
                methods[paypalIdx] = { ...methods[paypalIdx].toObject(), ...paypalData };
            }
        } else {
            methods = methods.filter(m => m.key !== 'paypal');
        }
    }
    
    // Final sort by sort_order
    methods.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    res.json(methods);
});

// @desc    Create Stripe Payment Intent
// @route   POST /api/payment/stripe/create-intent
// @access  Private
const createStripeIntent = asyncHandler(async (req, res) => {
    // Fetch Stripe secret from settings
    const setting = await Setting.findOne({ type: 'payment_settings' });
    console.log(`[Stripe Debug] Initial Settings: Enabled=${setting?.stripe_enabled}, Mode=${setting?.stripe_test_mode}, SecretSet=${!!setting?.stripe_test_secret_key}`);
    
    const isTest = (setting && setting.stripe_test_mode === false) ? false : true; 
    // ^ Modified logic to default to true unless explicitly false
    
    // Determine the candidate key from settings or environment
    let candidateKey = null;
    if (setting) {
        candidateKey = isTest ? setting.stripe_test_secret_key : setting.stripe_live_secret_key;
        console.log(`[Stripe Debug] Candidate from DB (${isTest ? 'TEST' : 'LIVE'}): ${candidateKey ? candidateKey.substring(0, 7) + '...' : 'NONE'}`);
    }
    
    // Fallback to environment variable if setting key is missing
    if (!candidateKey || candidateKey.trim() === '') {
        candidateKey = process.env.STRIPE_SECRET_KEY;
        console.log(`[Stripe Debug] Falling back to .env: ${candidateKey ? candidateKey.substring(0, 7) + '...' : 'NONE'}`);
    }

    // Safety Check: A secret key MUST start with 'sk_' or 'rk_'
    const finalKey = (candidateKey && (candidateKey.startsWith('sk_') || candidateKey.startsWith('rk_'))) ? candidateKey : null;
    
    console.log(`[Stripe] Mode: ${isTest ? 'TEST' : 'LIVE'}. Using Key: ${finalKey ? finalKey.substring(0, 7) + '...' + (finalKey.length > 10 ? finalKey.substring(finalKey.length - 4) : '') : 'MISSING/INVALID'}`);

    if (!finalKey) {
        console.error('[Stripe] Initialization failed - Provided key is either missing or is a Publishable Key instead of a Secret Key.');
        console.error('[Stripe] Full Candidate Key value:', candidateKey); // Only logs in terminal
        res.status(500);
        throw new Error('Stripe is not configured correctly. The backend requires a SECRET KEY (starting with sk_), but a publishable key (pk_) or nothing was found.');
    }

    let stripe = getStripe(finalKey);

    const { amount, currency } = req.body;
    console.log('Stripe Intent Request:', { amount, currency });

    if (!amount || isNaN(amount)) {
        res.status(400);
        throw new Error('Valid amount is required');
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // convert to cents
            currency: currency || 'inr',
            description: `Order for User: ${req.user?._id || 'Guest'} - ${req.user?.email || ''}`,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        console.log('[Stripe] Intent created successfully:', paymentIntent.id);

        res.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('[Stripe Error]', error.message);
        console.error('[Stripe Full Error Detail]:', JSON.stringify(error, null, 2));

        // Use a more appropriate status code if provided by Stripe
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
            message: error.message || 'Payment provider error',
            type: error.type,
            code: error.code,
            param: error.param
        });
    }
});

// @desc    Handle Stripe Webhooks
// @route   POST /api/payments/webhook
// @access  Public (Signature verified)
const stripeWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];

    // Fetch settings to get secret key and webhook secret
    const setting = await Setting.findOne({ type: 'payment_settings' });
    let secretKey = process.env.STRIPE_SECRET_KEY;
    let endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (setting) {
        const isTest = setting.stripe_test_mode !== false;
        secretKey = isTest ? setting.stripe_test_secret_key : setting.stripe_live_secret_key;
        endpointSecret = isTest ? setting.stripe_test_webhook_secret : setting.stripe_live_webhook_secret;
    }

    const stripe = getStripe(secretKey);
    if (!stripe || !endpointSecret) {
        console.error('Webhook Error: Stripe or Webhook Secret not configured');
        return res.status(400).send('Webhook Error: Server not configured');
    }

    let event;

    try {
        // IMPORTANT: Webhook needs the RAW body to verify signature
        // The server.js middleware must be configured to pass raw body for this route
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);

            // Update order status in database
            const order = await Order.findOne({ stripe_payment_id: paymentIntent.id });
            if (order) {
                order.payment_status = 'paid';
                await order.save();
                console.log(`Order ${order.order_number} marked as PAID via Webhook.`);
            }
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object;
            console.log(`PaymentIntent for ${failedIntent.amount} failed.`);
            const failedOrder = await Order.findOne({ stripe_payment_id: failedIntent.id });
            if (failedOrder) {
                failedOrder.payment_status = 'failed';
                await failedOrder.save();
            }
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

export {
    getPaymentMethods,
    createStripeIntent,
    stripeWebhook
};
