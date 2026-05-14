
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BACKUP_DIR = path.join(__dirname, 'db_backup');

// Helper to convert strings back to ObjectIds and Dates if they look like them
const reviveData = (data) => {
    return data.map(doc => {
        const revived = { ...doc };
        for (const [key, value] of Object.entries(doc)) {
            if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
                // Heuristic: if key ends in _id or is common ID field, convert to ObjectId
                if (key === '_id' || key.endsWith('_id') || ['user', 'sender_id', 'receiver_id', 'item'].includes(key)) {
                    revived[key] = new mongoose.Types.ObjectId(value);
                }
            } else if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    revived[key] = value.map(item => {
                        if (typeof item === 'string' && /^[0-9a-fA-F]{24}$/.test(item)) {
                            return new mongoose.Types.ObjectId(item);
                        }
                        if (typeof item === 'object' && item !== null) {
                            // Recursively revive objects in arrays (like attributes)
                            return reviveData([item])[0];
                        }
                        return item;
                    });
                } else {
                    // Recursively revive nested objects
                    revived[key] = reviveData([value])[0];
                }
            }
        }
        return revived;
    });
};

const restoreDatabase = async () => {
    try {
        console.log('🔗 Connecting to MongoDB for Restore...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.');

        const files = fs.readdirSync(BACKUP_DIR);
        console.log(`📦 Found ${files.length} backup files.`);

        for (const file of files) {
            if (path.extname(file) === '.json') {
                const collectionName = path.basename(file, '.json');
                const filePath = path.join(BACKUP_DIR, file);

                console.log(`➡️ Restoring: ${collectionName}...`);
                const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                if (rawData.length === 0) {
                    console.log(`   ⚠️ Skipping ${collectionName} (empty)`);
                    continue;
                }

                const revivedData = reviveData(rawData);

                // Clear existing data
                await mongoose.connection.db.collection(collectionName).deleteMany({});

                // Insert revived data with duplicate key handling
                try {
                    await mongoose.connection.db.collection(collectionName).insertMany(revivedData, { ordered: false });
                    console.log(`   ✅ Restored ${revivedData.length} documents to ${collectionName}`);
                } catch (insertErr) {
                    if (insertErr.code === 11000) {
                        const successCount = insertErr.result?.nInserted || 0;
                        console.log(`   ⚠️ Restored ${successCount} documents to ${collectionName} (skipped duplicates)`);
                    } else {
                        throw insertErr;
                    }
                }
            }
        }

        console.log('\n🎊 Database restoration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Restore failed:', err);
        process.exit(1);
    }
};

restoreDatabase();
