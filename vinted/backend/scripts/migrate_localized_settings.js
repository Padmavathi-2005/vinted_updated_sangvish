import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        const isLocal = process.env.NODE_ENV !== 'production';
        const liveUri = process.env.MONGO_URI;
        const localUri = process.env.LOCAL_MONGO_URI;
        const dbUriToUse = isLocal ? localUri : liveUri;

        console.log(`Connecting to ${isLocal ? 'Local' : 'Live'} DB...`);
        await mongoose.connect(dbUriToUse);
        console.log('Connected to DB');

        const db = mongoose.connection.db;
        const settingsColl = db.collection('settings');
        const paymentsColl = db.collection('paymentmethods'); // Note: lowecase usually

        const fieldsToMigrate = ['site_name', 'cookie_heading', 'cookie_message', 'cookie_button_text'];

        // 1. Fix Settings
        const settings = await settingsColl.find({}).toArray();
        console.log(`Found ${settings.length} settings documents`);

        for (const doc of settings) {
            const update = {};
            let needsUpdate = false;

            fieldsToMigrate.forEach(field => {
                const val = doc[field];

                // Case A: It's a string in DB
                if (val && typeof val === 'string') {
                    console.log(`  [${doc.type}] Migrating string field "${field}"`);
                    update[field] = { en: val };
                    needsUpdate = true;
                }
                // Case B: It's that weird numeric object Mongoose created
                else if (val && typeof val === 'object' && val['0'] !== undefined && val['1'] !== undefined) {
                    console.log(`  [${doc.type}] Detected broken numeric object in "${field}", fixing...`);
                    // Reconstruction
                    let reconstructed = '';
                    let i = 0;
                    while (val[i.toString()] !== undefined) {
                        reconstructed += val[i.toString()];
                        i++;
                    }
                    update[field] = { en: reconstructed };
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                await settingsColl.updateOne({ _id: doc._id }, { $set: update });
                console.log(`  [${doc.type}] Updated successfully`);
            }
        }

        // 2. Fix Payment Methods
        const paymentMethods = await paymentsColl.find({}).toArray();
        console.log(`Found ${paymentMethods.length} payment methods`);

        for (const doc of paymentMethods) {
            const update = {};
            let needsUpdate = false;
            const pmFields = ['name', 'description'];

            pmFields.forEach(field => {
                const val = doc[field];
                if (val && typeof val === 'string') {
                    update[field] = { en: val };
                    needsUpdate = true;
                } else if (val && typeof val === 'object' && val['0'] !== undefined && val['1'] !== undefined) {
                    let reconstructed = '';
                    let i = 0;
                    while (val[i.toString()] !== undefined) {
                        reconstructed += val[i.toString()];
                        i++;
                    }
                    update[field] = { en: reconstructed };
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                await paymentsColl.updateOne({ _id: doc._id }, { $set: update });
                console.log(`  [PM: ${doc.key}] Updated successfully`);
            }
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
