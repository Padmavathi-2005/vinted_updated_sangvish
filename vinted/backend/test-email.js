import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Setting from './models/Setting.js';
import sendEmail from './utils/sendEmail.js';

const testEmailSetup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to DB');

        const settings = await Setting.findOne({ type: 'email_settings' });
        console.log('--- Current Email Settings ---');
        console.log('Host:', settings?.mail_host);
        console.log('Port:', settings?.mail_port);
        console.log('Username:', settings?.mail_username);
        // Do not log password entirely
        console.log('Password length:', settings?.mail_password?.length || 0);
        console.log('Encryption:', settings?.mail_encryption);
        console.log('From Address:', settings?.mail_from_address);
        console.log('------------------------------');

        if (!settings?.mail_host && !settings?.mail_from_address) {
            console.log('❌ Error: Both Mail Host and Mail From Address are empty in the database.');
            process.exit(1);
        }

        console.log('✉️ Attempting to send a test email to the "From" address...');
        await sendEmail({
            email: settings.mail_from_address || 'test@example.com',
            subject: 'Test Email Verification',
            message: 'If you are receiving this, your SMTP settings are correct!',
            html: '<p>If you are receiving this, your SMTP settings are correct!</p>'
        });
        
        console.log('✅ Success! Test email sent successfully without crashing.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Failed to send email.');
        console.error('Error Details:', error.message);
        console.error(error);
        process.exit(1);
    }
};

testEmailSetup();
