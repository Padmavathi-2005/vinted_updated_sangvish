
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BACKUP_DIR = path.join(__dirname, 'db_backup');

const backupDatabase = async () => {
    try {
        console.log('🔗 Connecting to MongoDB for Backup...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.');

        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR);
            console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
        }

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📦 Found ${collections.length} collections.`);

        for (const coll of collections) {
            const name = coll.name;
            if (name.startsWith('system.')) continue;

            console.log(`➡️ Exporting: ${name}...`);
            const data = await mongoose.connection.db.collection(name).find({}).toArray();
            
            const filePath = path.join(BACKUP_DIR, `${name}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`   ✅ Saved ${data.length} documents to ${name}.json`);
        }

        console.log('\n🎊 Database backup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Backup failed:', err);
        process.exit(1);
    }
};

backupDatabase();
