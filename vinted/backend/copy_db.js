import { MongoClient } from 'mongodb';
import dns from 'dns';

// Fix DNS for Windows
dns.setServers(['8.8.8.8', '8.8.4.4']);

const oldUri = 'mongodb+srv://abinayashri1985_db_user:Passwd12345678@vinted.ikcxkqu.mongodb.net/vinted_db?appName=vinted';
const newUri = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

async function copyDB() {
  const sourceClient = new MongoClient(oldUri);
  const targetClient = new MongoClient(newUri);

  try {
    console.log('Connecting to source Database...');
    await sourceClient.connect();
    const sourceDb = sourceClient.db();

    console.log('Connecting to target Database...');
    await targetClient.connect();
    const targetDb = targetClient.db();

    const collections = await sourceDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections. Starting migration...`);

    // Clean up target db to ensure a fresh copy
    await targetDb.dropDatabase();
    console.log('Cleared target database.');

    for (const collInfo of collections) {
      if (collInfo.type === 'view') continue;
      const collName = collInfo.name;
      console.log(`Copying collection: ${collName}`);

      const sourceColl = sourceDb.collection(collName);
      const targetColl = targetDb.collection(collName);

      let batch = [];
      const batchSize = 2500;
      let totalCopied = 0;

      const cursor = sourceColl.find({});
      for await (const doc of cursor) {
        batch.push(doc);
        if (batch.length === batchSize) {
          await targetColl.insertMany(batch);
          totalCopied += batch.length;
          batch = [];
        }
      }
      if (batch.length > 0) {
        await targetColl.insertMany(batch);
        totalCopied += batch.length;
      }

      if (totalCopied > 0) {
        console.log(`  -> Copied ${totalCopied} documents.`);
      } else {
        console.log(`  -> Empty collection.`);
      }

      // Restore indexes
      const indexes = await sourceColl.indexes();
      const newIndexes = indexes.filter(idx => idx.name !== '_id_').map(idx => {
        const newIdx = { ...idx };
        delete newIdx.v;
        delete newIdx.ns;
        return newIdx;
      });
      if (newIndexes.length > 0) {
        for (const idx of newIndexes) {
          try {
            let options = { ...idx };
            delete options.key;
            await targetColl.createIndex(idx.key, options);
          } catch (err) {
            console.log(`  -> Failed to create index ${idx.name}: ${err.message}`);
          }
        }
        console.log(`  -> Copied ${newIndexes.length} custom indexes.`);
      }
    }

    console.log('✅ DATABASE CLONING COMPLETE!');

  } catch (error) {
    console.error('Error migrating database:', error);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

copyDB();
