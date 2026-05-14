
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
        for (const key in revived) {
            const value = revived[key];
            
            // Handle MongoDB extended JSON or simple strings
            if (typeof value === 'string') {
                // Check if it's a 24-char hex string (likely ObjectId)
                if (/^[0-9a-fA-F]{24}$/.test(value) && (key.endsWith('_id') || key === '_id')) {
                    revived[key] = new mongoose.Types.ObjectId(value);
                } 
                // Check if it's an ISO date string
                else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                    revived[key] = new Date(value);
                }
            } else if (value && typeof value === 'object') {
                // Handle nested objects (like attributes array)
                if (Array.isArray(value)) {
                    revived[key] = reviveData(value);
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

        if (!fs.existsSync(BACKUP_DIR)) {
            console.error(`❌ Backup directory not found: ${BACKUP_DIR}`);
            process.exit(1);
        }

        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
        console.log(`📦 Found ${files.length} backup files.`);

        for (const file of files) {
            const collectionName = file.replace('.json', '');
            if (collectionName === 'ts') continue; // Skip metadata file if exists

            console.log(`⬅️ Restoring: ${collectionName}...`);
            const rawData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, file), 'utf8'));
            
            if (rawData.length > 0) {
                const revivedData = reviveData(rawData);
                
                // Clear collection
                await mongoose.connection.db.collection(collectionName).deleteMany({});
                
                // Insert data
                await mongoose.connection.db.collection(collectionName).insertMany(revivedData);
                console.log(`   ✅ Restored ${rawData.length} documents to ${collectionName}`);
            } else {
                console.log(`   ⚪ Collection ${collectionName} is empty, skipping.`);
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
