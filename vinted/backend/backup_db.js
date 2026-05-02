
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

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const backup = async () => {
    try {
        await mongoose.connect(dbUri);
        console.log('Connected to DB for backup...');

        const collections = await mongoose.connection.db.listCollections().toArray();
        
        for (const col of collections) {
            const name = col.name;
            console.log(`Backing up collection: ${name}`);
            const data = await mongoose.connection.db.collection(name).find({}).toArray();
            fs.writeFileSync(
                path.join(backupDir, `${name}.json`), 
                JSON.stringify(data, null, 2)
            );
        }

        console.log(`Backup completed! Files saved in: ${backupDir}`);
        await mongoose.disconnect();
    } catch (err) {
        console.error('Backup failed:', err);
    }
};

backup();
