const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted').then(async () => {
    const db = mongoose.connection.db;
    
    // Update footer settings
    const settings = await db.collection('settings').findOne({ type: 'footer_settings' });
    if (settings) {
        await db.collection('settings').updateOne(
            { type: 'footer_settings' },
            {
                $set: {
                    'footer_tagline.fr': 'Votre destination de confiance pour la mode pré-aimée. Achetez, vendez et découvrez des pièces uniques tout en promouvant un style durable.',
                    'footer_copyright.fr': '© 2024 Vinted Clone. Tous droits réservés.'
                }
            }
        );
        console.log("Updated footer_settings in DB.");
    }

    process.exit(0);
});
