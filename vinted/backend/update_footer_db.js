import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Setting from './models/Setting.js';

const updateTranslations = async () => {
    try {
        await connectDB();
        const settings = await Setting.findOne({ type: 'footer_settings' });
        
        if (settings) {
            console.log('Found footer_settings, updating translations...');
            
            // Get current mixed objects or initialize
            const tagline = settings.footer_tagline || {};
            const copyright = settings.footer_copyright || {};
            
            // Add French translations
            tagline.fr = "Votre destination de confiance pour la mode pré-aimée. Achetez, vendez et découvrez des pièces uniques tout en promouvant un style durable.";
            copyright.fr = "© 2024 Vinted Clone Inc. Fabriqué avec passion pour une meilleure planète.";
            
            // Re-assign to trigger mongoose Mixed type modification tracking
            settings.footer_tagline = tagline;
            settings.footer_copyright = copyright;
            
            // Mark as modified so Mongoose knows the Mixed fields changed
            settings.markModified('footer_tagline');
            settings.markModified('footer_copyright');
            
            await settings.save();
            console.log('✅ Successfully added French translations to the database!');
        } else {
            console.log('❌ footer_settings document not found in the database.');
        }
    } catch (error) {
        console.error('Error updating translations:', error);
    } finally {
        mongoose.connection.close();
    }
};

updateTranslations();
