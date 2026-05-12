import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Setting from './models/Setting.js';
import connectDB from './config/db.js';

dotenv.config();

const fixBranding = async () => {
    try {
        await connectDB();
        console.log('Connected to database...');

        // 1. Fix Site Settings
        const siteSettings = await Setting.findOne({ type: 'site_settings' });
        if (siteSettings) {
            console.log('Current site name:', siteSettings.site_name);
            siteSettings.site_name = { en: 'Resale', ar: 'Resale' };
            await siteSettings.save();
            console.log('✅ Site name updated to Resale');
        } else {
            await Setting.create({
                type: 'site_settings',
                site_name: { en: 'Resale', ar: 'Resale' }
            });
            console.log('✅ Site settings created with Resale');
        }

        // 2. Fix Footer Settings
        const footerSettings = await Setting.findOne({ type: 'footer_settings' });
        if (footerSettings) {
            footerSettings.footer_copyright = { 
                en: '© 2024 Resale. All rights reserved.',
                ar: '© 2024 Resale. جميع الحقوق محفوظة.'
            };
            await footerSettings.save();
            console.log('✅ Footer copyright updated');
        }

        console.log('\n🎉 Brand cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixBranding();
