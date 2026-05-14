import mongoose from 'mongoose';

const sourceURI = 'mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted';
const targetURI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

const migrate = async () => {
    try {
        console.log('--- DB MIGRATION STARTED ---');

        // 1. Connect to Source
        console.log('Connecting to SOURCE...');
        const sourceConn = await mongoose.createConnection(sourceURI).asPromise();
        console.log('✅ Source Connected.');

        // 2. Connect to Target
        console.log('Connecting to TARGET...');
        const targetConn = await mongoose.createConnection(targetURI).asPromise();
        console.log('✅ Target Connected.');

        const collections = await sourceConn.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections to copy.`);

        for (const col of collections) {
            console.log(`Copying collection: ${col.name}...`);
            const data = await sourceConn.db.collection(col.name).find({}).toArray();
            
            if (data.length > 0) {
                // Clear target collection first
                await targetConn.db.collection(col.name).deleteMany({});
                // Insert data
                await targetConn.db.collection(col.name).insertMany(data);
                console.log(`   ✅ Done: ${data.length} documents copied.`);
            } else {
                console.log(`   (Empty)`);
            }
        }

        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ MIGRATION FAILED:', err.message);
        process.exit(1);
    }
};

migrate();
