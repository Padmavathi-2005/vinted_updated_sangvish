const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const dotenv = require('dotenv').config();

const fixSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const allSettings = await Setting.find({});
        console.log(`Found ${allSettings.length} setting documents.`);

        // Find duplicates or older types
        const types = {};
        for (const s of allSettings) {
            if (!types[s.type]) {
                types[s.type] = s._id;
            } else {
                console.log(`Deleting duplicate/extra setting for type ${s.type}: ${s._id}`);
                await Setting.findByIdAndDelete(s._id);
            }
        }

        // Ensure we have at least admin_settings
        let adminSettings = await Setting.findOne({ type: 'admin_settings' });
        if (!adminSettings) {
            // Try to find default_settings and rename it
            adminSettings = await Setting.findOne({ type: 'default_settings' });
            if (adminSettings) {
                console.log('Found legacy default_settings, renaming to admin_settings');
                adminSettings.type = 'admin_settings';
                await adminSettings.save();
            } else {
                console.log('Creating fresh admin_settings');
                adminSettings = await Setting.create({
                    type: 'admin_settings',
                    site_name: 'Vinted Admin',
                    primary_color: '#0ea5e9',
                });
            }
        }

        console.log('Final admin_settings:', JSON.stringify(adminSettings, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

fixSettings();
