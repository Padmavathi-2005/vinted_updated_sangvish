import mongoose from 'mongoose';
import colors from 'colors';

const SOURCE_URI = 'mongodb+srv://abinayashri1985_db_user:Passwd12345678@vinted.ikcxkqu.mongodb.net/vinted_db?appName=vinted';
const TARGET_URI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

const migrate = async () => {
    try {
        console.log('🚀 Starting Data Migration...'.cyan.bold);
        
        // 1. Connect to Source
        const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        console.log('✅ Connected to SOURCE database.'.green);

        // 2. Connect to Target
        const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('✅ Connected to TARGET database.'.green);

        // 3. Get all collections from Source
        const collections = await sourceConn.db.listCollections().toArray();
        console.log(`📦 Found ${collections.length} collections to migrate.`.yellow);

        for (const col of collections) {
            const name = col.name;
            if (name.startsWith('system.')) continue; // Skip system collections

            console.log(`  -> Migrating collection: ${name.magenta}...`);

            const sourceCol = sourceConn.db.collection(name);
            const targetCol = targetConn.db.collection(name);

            // Fetch all data
            const data = await sourceCol.find({}).toArray();
            
            if (data.length > 0) {
                // Clear target collection first
                await targetCol.deleteMany({});
                // Insert data
                await targetCol.insertMany(data);
                console.log(`     ✅ Migrated ${data.length} documents.`.green);
            } else {
                console.log(`     ℹ️ Collection is empty, skipping.`.gray);
            }
        }

        console.log('\n✨ Database Migration Completed Successfully!'.green.bold);
        
        await sourceConn.close();
        await targetConn.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration Failed:'.red.bold, error);
        process.exit(1);
    }
};

migrate();
