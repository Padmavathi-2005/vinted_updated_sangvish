import cron from 'node-cron';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Nightly Database Reset Job
 * Runs every day at 12:00 AM (Midnight)
 * This job clears the current database and restores it from the 'db_backup' folder.
 */
const startNightlyResetJob = () => {
    // Schedule: 0 0 * * * (Midnight every day)
    cron.schedule('0 0 * * *', async () => {
        console.log('--- [CRON] Starting Nightly Database Reset ---');
        
        const dbUri = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;
        
        // Robust path detection: check both local and server structures
        let backupDir = path.join(__dirname, '..', 'db_backup'); // Local (vinted/backend/db_backup)
        if (!fs.existsSync(backupDir)) {
            backupDir = path.join(__dirname, 'db_backup'); // Server (backend/db_backup)
        }

        try {
            if (!fs.existsSync(backupDir)) {
                console.error('[CRON ERROR] Backup directory not found at:', backupDir);
                return;
            }

            // The main server is already connected to mongoose, but we can use the connection directly
            const db = mongoose.connection.db;
            if (!db) {
                console.error('[CRON ERROR] Database connection not available.');
                return;
            }

            console.log('[CRON] Clearing current database collections...');
            const collections = await db.listCollections().toArray();
            for (const col of collections) {
                console.log(`[CRON] Emptying collection: ${col.name}`);
                await db.collection(col.name).deleteMany({});
            }

            console.log('[CRON] Restoring data from backup files...');
            const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
            
            for (const file of files) {
                const colName = file.replace('.json', '');
                const filePath = path.join(backupDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                if (data && data.length > 0) {
                    console.log(`[CRON] Restoring ${data.length} docs into: ${colName}`);
                    
                    // Basic data processing for ObjectIds and Dates
                    const processedData = data.map(doc => {
                        if (doc._id && typeof doc._id === 'object' && doc._id.$oid) {
                            doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
                        }
                        ['created_at', 'updated_at', 'last_login', 'date'].forEach(field => {
                            if (doc[field] && typeof doc[field] === 'string' && !isNaN(Date.parse(doc[field]))) {
                                doc[field] = new Date(doc[field]);
                            }
                        });
                        Object.keys(doc).forEach(key => {
                            if (key.endsWith('_id') && typeof doc[key] === 'string' && doc[key].length === 24) {
                                try { doc[key] = new mongoose.Types.ObjectId(doc[key]); } catch(e) {}
                            }
                        });
                        return doc;
                    });

                    await db.collection(colName).insertMany(processedData);
                }
            }

            console.log('--- [CRON SUCCESS] Database has been reset and restored from backup ---');
        } catch (error) {
            console.error('[CRON FATAL ERROR] Nightly reset failed:', error);
        }
    });
    
    console.log('✅ Nightly Database Reset Job scheduled for 12:00 AM daily.'.cyan);
};

export default startNightlyResetJob;
