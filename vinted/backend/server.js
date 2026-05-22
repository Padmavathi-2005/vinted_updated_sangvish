import dotenv from 'dotenv';
import express from 'express';
import colors from 'colors';
import { errorHandler } from './middleware/errorMiddleware.js';
import connectDB from './config/db.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';

// Routes imports
import itemRoutes from './routes/itemRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import currencyRoutes from './routes/currencyRoutes.js';
import languageRoutes from './routes/languageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import timezoneRoutes from './routes/timezoneRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import frontendContentRoutes from './routes/frontendContentRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import authRoutes from './routes/authRoutes.js';
import passport from 'passport';
import aiRoutes from './routes/aiRoutes.js';
import adminMessageRoutes from './routes/adminMessageRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import shippingCompanyRoutes from './routes/shippingCompanyRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import { protect, adminProtect } from './middleware/authMiddleware.js';
import { getReportsAdmin, updateReportStatus, handleReportAction } from './controllers/reportController.js';
import startDiscountReminderJob from './jobs/discountReminderJob.js';
import startAutoCompleteOrderJob from './jobs/autoCompleteOrderJob.js';
import sendEmail from './utils/sendEmail.js';
import Setting from './models/Setting.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the backend directory to avoid CWD issues
dotenv.config({ path: path.join(__dirname, '.env') });

const port = process.env.PORT || 5003;

const startServer = async () => {
    try {
        await connectDB();
        console.log('--- Environment Check ---');
        console.log('PORT from env:', process.env.PORT);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');
        console.log('RECAPTCHA_SITE_KEY loaded:', process.env.RECAPTCHA_SITE_KEY ? 'YES' : 'NO');
        console.log('RECAPTCHA_ENABLED:', process.env.RECAPTCHA_ENABLED);
        console.log('-------------------------');

        const app = express();
        const server = http.createServer(app);
        server.timeout = 600000; // 10 minutes timeout for long-running backups
        const io = new Server(server, {
            path: '/api/socket.io',
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        // Export io globally for Mongoose middleware
        global.io = io;

        // CORS — allow all origins with proper headers
        app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['Content-Length', 'Content-Type'],
        }));

        // Stripe webhook needs raw body, must come before express.json()
        app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));

        // Socket.io handlers
        io.on('connection', (socket) => {
            console.log('User connected:', socket.id);
            socket.on('join_conversation', (conversationId) => {
                socket.join(conversationId);
                console.log(`User joined conversation: ${conversationId}`);
            });
            socket.on('join_user', (userId) => {
                if (userId) {
                    socket.join(userId.toString());
                    console.log(`User joined personal room: ${userId}`);
                }
            });
            socket.on('mark_read', async ({ conversation_id, user_id }) => {
                if (!conversation_id || !user_id) return;
                try {
                    const Message = (await import('./models/Message.js')).default;
                    const Conversation = (await import('./models/Conversation.js')).default;
                    const updateResult = await Message.updateMany(
                        { conversation_id, receiver_id: user_id, is_read: false },
                        { is_read: true }
                    );
                    // Even if modifiedCount is 0, we still broadcast just in case of race conditions
                    setTimeout(async () => {
                        io.to(conversation_id).emit('messages_read', { conversation_id });
                        const conversation = await Conversation.findById(conversation_id);
                        if (conversation) {
                            const otherParticipant = conversation.participants.find(p => (p.user?._id || p.user)?.toString() !== user_id.toString());
                            if (otherParticipant) {
                                const otherUserId = (otherParticipant.user?._id || otherParticipant.user).toString();
                                io.to(otherUserId).emit('messages_read', { conversation_id });
                            }
                        }
                    }, 500);
                } catch (error) {
                    console.error('Socket mark_read error:', error);
                }
            });
            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });

        // Pass io to routes
        app.use((req, res, next) => {
            req.io = io;
            next();
        });

        // Static options: add CORS headers to every image response
        const imageStaticOptions = {
            setHeaders: (res) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                res.setHeader('Cache-Control', 'public, max-age=86400');
            }
        };

        // Unified static images serving
        app.use('/images', express.static(path.join(__dirname, 'images'), imageStaticOptions));
        app.use('/images/items', express.static(path.join(__dirname, 'images/items'), imageStaticOptions));
        app.use('/images/profile', express.static(path.join(__dirname, 'images/profile'), imageStaticOptions));

        // Initialize Passport
        app.use(passport.initialize());

        // API Routes
        app.use('/api/items', itemRoutes);
        app.use('/api/settings', settingRoutes);
        app.use('/api/admin', adminRoutes);
        app.use('/api/admin-messages', adminMessageRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/categories', categoryRoutes);
        app.use('/api/favorites', favoriteRoutes);
        app.use('/api/currencies', currencyRoutes);
        app.use('/api/languages', languageRoutes);
        app.use('/api/notifications', notificationRoutes);
        app.use('/api/timezones', timezoneRoutes);
        app.use('/api/messages', messageRoutes);
        app.use('/api/payments', paymentRoutes);
        app.use('/api/wallet', walletRoutes);
        app.use('/api/orders', orderRoutes);
        app.use('/api/reviews', reviewRoutes);
        app.use('/api/pages', pageRoutes);
        app.use('/api/search', searchRoutes);
        app.use('/api/frontend-content', frontendContentRoutes);
        app.use('/api/newsletter', newsletterRoutes);
        app.use('/api/auth', authRoutes);
        app.use('/api/ai', aiRoutes);
        app.use('/api/shipping', shippingRoutes);
        app.use('/api/shipping-companies', shippingCompanyRoutes);
        app.use('/api/moderation-reports', adminProtect, getReportsAdmin);
        app.use('/api/reports', reportRoutes);
        app.use('/api/contact', contactRoutes);

        // Root Mail Check Endpoints
        app.get(['/mail_check', '/api/mail_check'], async (req, res) => {
            try {
                let recipientEmail = req.query.email || req.query.to;
                
                // Fallback: If no recipient email was passed in URL, load the default recipient from database
                if (!recipientEmail) {
                    const settings = await Setting.findOne({ type: 'email_settings' });
                    recipientEmail = settings?.mail_from_address || settings?.mail_username || process.env.EMAIL_USER;
                }

                if (!recipientEmail) {
                    return res.status(400).json({
                        success: false,
                        message: "Please provide a recipient email or configure SMTP settings in the database. Usage: /mail_check?email=your-email@example.com"
                    });
                }

                console.log(`[MailCheck] Attempting to send test email to: ${recipientEmail}`);

                await sendEmail({
                    email: recipientEmail,
                    subject: 'Vinted System - Test Email Verification',
                    message: `Hello! This is a test email sent from the Vinted system to verify that your mail configuration is working correctly. Sent at: ${new Date().toLocaleString()}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
                            <h2 style="color: #0ea5e9;">Vinted Mail System Working! ✅</h2>
                            <p>Hello,</p>
                            <p>If you are receiving this email, it means your SMTP configuration in the Vinted platform is set up correctly and working!</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Recipient:</td>
                                    <td style="padding: 8px 0;">${recipientEmail}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Timestamp:</td>
                                    <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
                                </tr>
                            </table>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #777;">This is an automated system check email. Please do not reply directly to this message.</p>
                        </div>
                    `
                });

                console.log(`[MailCheck] Test email successfully sent to: ${recipientEmail}`);

                return res.status(200).json({
                    success: true,
                    message: `Test email successfully sent to ${recipientEmail}! Check your inbox.`,
                    details: {
                        recipient: recipientEmail,
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (error) {
                console.error('[MailCheck] Failed to send test email:', error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to send email. SMTP configuration is invalid or connection failed.",
                    error: error.message
                });
            }
        });

        // Start scheduled jobs
        startDiscountReminderJob();
        startAutoCompleteOrderJob();


        app.use(errorHandler);

        server.listen(port, () => {
            console.log(`\n🚀 Unified Vinted Server started on port ${port}`.green.bold);
            console.log(`🔗 Main API: http://localhost:${port}/api`.cyan);
            console.log(`🔗 Admin API: http://localhost:${port}/api/admin`.cyan);
            console.log('---------------------------------'.gray);
        });
    } catch (error) {
        console.error('SERVER FATAL ERROR:', error.message);
        process.exit(1);
    }
};

startServer();
