import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const OLD_MONGO_URI = 'mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted';
const NEW_MONGO_URI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

async function migrate() {
    try {
        console.log('🔗 Connecting to Source DB...');
        const sourceConn = await mongoose.createConnection(OLD_MONGO_URI).asPromise();
        console.log('✅ Connected to Source DB');

        console.log('🔗 Connecting to Target DB...');
        const targetConn = await mongoose.createConnection(NEW_MONGO_URI).asPromise();
        console.log('✅ Connected to Target DB');

        const collections = await sourceConn.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections to migrate.`);

        for (const coll of collections) {
            const name = coll.name;
            if (name.startsWith('system.')) continue;

            console.log(`📦 Migrating collection: ${name}...`);
            const data = await sourceConn.db.collection(name).find({}).toArray();
            
            if (data.length > 0) {
                // Clear target collection first
                await targetConn.db.collection(name).deleteMany({});
                // Insert data
                await targetConn.db.collection(name).insertMany(data);
                console.log(`✅ Migrated ${data.length} documents to ${name}`);
            } else {
                console.log(`⚪ Collection ${name} is empty, skipping.`);
            }
        }

        console.log('🎊 Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
