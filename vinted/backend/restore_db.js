
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const dbUri = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;
const backupDir = path.join(__dirname, 'db_backup');

const restore = async () => {
    try {
        if (!fs.existsSync(backupDir)) {
            console.error('Backup directory not found. Please run backup_db.js first.');
            process.exit(1);
        }

        await mongoose.connect(dbUri);
        console.log('Connected to DB for restore...');

        // Get all collections currently in DB to clear them
        const collections = await mongoose.connection.db.listCollections().toArray();
        for (const col of collections) {
            console.log(`Clearing collection: ${col.name}`);
            await mongoose.connection.db.collection(col.name).deleteMany({});
        }

        // Load files and restore
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const colName = file.replace('.json', '');
            const filePath = path.join(backupDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (data.length > 0) {
                console.log(`Restoring ${data.length} documents into: ${colName}`);
                // Use insertMany but handle _id as it might be stored as string in JSON
                // Map data to ensure ObjectIds if needed, but Mongoose/Mongo usually handles string-to-id if saved correctly
                // For safety with JSON.stringify/JSON.parse:
                const processedData = data.map(doc => {
                    // Handle ObjectId
                    if (doc._id && typeof doc._id === 'object' && doc._id.$oid) {
                        doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
                    }
                    
                    // Handle common Date fields
                    ['created_at', 'updated_at', 'last_login', 'date'].forEach(field => {
                        if (doc[field] && typeof doc[field] === 'string' && !isNaN(Date.parse(doc[field]))) {
                            doc[field] = new Date(doc[field]);
                        }
                    });

                    // Ensure other ID fields are ObjectIds if they look like strings
                    // This is a generic check for fields ending in _id
                    Object.keys(doc).forEach(key => {
                        if (key.endsWith('_id') && typeof doc[key] === 'string' && doc[key].length === 24) {
                            try { doc[key] = new mongoose.Types.ObjectId(doc[key]); } catch(e) {}
                        }
                    });

                    return doc;
                });
                await mongoose.connection.db.collection(colName).insertMany(processedData);
            }
        }

        console.log('Restore completed successfully!');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Restore failed:', err);
    }
};

restore();
