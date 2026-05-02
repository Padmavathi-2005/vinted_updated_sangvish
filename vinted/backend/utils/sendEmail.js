import nodemailer from 'nodemailer';
import Setting from '../models/Setting.js';

const sendEmail = async (options) => {
    // 1. Fetch settings from DB
    const settings = await Setting.findOne({ type: 'email_settings' });
    const siteSettings = await Setting.findOne({ type: 'site_settings' });

    const fromAddress = settings?.mail_from_address || process.env.EMAIL_USER;
    
    // Intelligent defaults for missing fields
    const host = settings?.mail_host || process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(settings?.mail_port) || parseInt(process.env.EMAIL_PORT) || 587; // Google prefers 587
    const encryption = settings?.mail_encryption || 'tls';
    // If username is missing but from_address is there, assume username = from_address
    const username = settings?.mail_username || fromAddress;

    const mailConfig = {
        host: host,
        port: port,
        secure: (encryption === 'ssl' || port === 465), 
        auth: {
            user: username,
            pass: settings?.mail_password || process.env.EMAIL_PASS,
        },
    };

    // If STARTTLS is used (port 587 or 2525 etc)
    if (!mailConfig.secure) {
        mailConfig.tls = {
            rejectUnauthorized: false
        };
    }

    // 2. Create a transporter
    const transporter = nodemailer.createTransport(mailConfig);

    // 3. Define email options
    let fromName = settings?.mail_from_name;
    if (!fromName && siteSettings?.site_name) {
        fromName = typeof siteSettings.site_name === 'object' 
            ? (siteSettings.site_name.en || Object.values(siteSettings.site_name)[0]) 
            : siteSettings.site_name;
    }
    if (!fromName) fromName = 'Vinted Support';

    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    // 4. Send the email
    await transporter.sendMail(mailOptions);
};

export default sendEmail;
