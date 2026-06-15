import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

async function updateSMTP() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const settingsCol = db.collection('settings');
        
        await settingsCol.updateOne(
            { type: 'email_settings' },
            {
                $set: {
                    mail_mailer: 'smtp',
                    mail_host: 'smtp.gmail.com',
                    mail_port: 587,
                    mail_username: 'sangvish21@gmail.com',
                    mail_password: 'mstuxmmvryixrksl',
                    mail_encryption: 'tls',
                    mail_from_address: 'sangvish21@gmail.com',
                    mail_from_name: 'Vinted Support'
                }
            },
            { upsert: true }
        );
        console.log('Successfully updated email settings in MongoDB!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

updateSMTP();
