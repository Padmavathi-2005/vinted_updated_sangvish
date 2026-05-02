const { MongoClient } = require('mongodb');

// Replace these two connection strings with your actual Atlas URIs.
// IMPORTANT: Make sure the database name (e.g., /vinted) is included right before the `?` in the URIs!
const SOURCE_URI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';
const TARGET_URI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

async function copyDatabase() {
    const sourceClient = new MongoClient(SOURCE_URI);
    const targetClient = new MongoClient(TARGET_URI);

    try {
        console.log('Connecting to both databases...');
        await sourceClient.connect();
        await targetClient.connect();
        console.log('Connections established.');

        // It detects the DB name based on what you put in the URI
        const sourceDbName = sourceClient.options.dbName;
        const targetDbName = targetClient.options.dbName;

        if (!sourceDbName || !targetDbName) {
            console.error('❌ Error: You must specify the database name in BOTH connection strings (e.g., ...mongodb.net/vinted?...)');
            return;
        }

        const sourceDb = sourceClient.db();
        const targetDb = targetClient.db();

        console.log(`\n📋 Copying from [${sourceDbName}] to [${targetDbName}]...\n`);

        // Get all collections from the source
        const collections = await sourceDb.listCollections().toArray();
        let totalCopied = 0;

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;

            // Skip MongoDB internal tables automatically
            if (collectionName.startsWith('system.')) continue;

            console.log(`=> Starting collection: ${collectionName}`);
            const sourceCollection = sourceDb.collection(collectionName);
            const targetCollection = targetDb.collection(collectionName);

            // Optional: Drop the collection in the target DB before inserting to prevent duplicate errors
            try {
                await targetCollection.drop();
                console.log(`  ...cleared existing data in target collection`);
            } catch (dropErr) {
                // Ignore drop errors if the collection didn't exist yet
                if (dropErr.code !== 26) {
                    console.log(`  ...notice: could not drop collection (${dropErr.message})`);
                }
            }

            // Fetch records using a Cursor to prevent running out of memory
            const cursor = sourceCollection.find({});
            let batch = [];
            let count = 0;
            const BATCH_SIZE = 500; // Copies 500 documents at a time

            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                batch.push(doc);

                if (batch.length === BATCH_SIZE) {
                    await targetCollection.insertMany(batch);
                    count += batch.length;
                    batch = [];
                    console.log(`  ...inserted ${count} documents`);
                }
            }

            // Insert any remaining documents
            if (batch.length > 0) {
                await targetCollection.insertMany(batch);
                count += batch.length;
            }

            totalCopied += count;
            console.log(`✅ Finished ${collectionName} - Total: ${count} documents\n`);
        }

        console.log(`🎉 Database copy completed successfully! A total of ${totalCopied} documents were copied.`);
    } catch (err) {
        console.error('❌ An error occurred during the copy process:', err);
    } finally {
        await sourceClient.close();
        await targetClient.close();
        console.log('Connections closed.');
    }
}

copyDatabase();
