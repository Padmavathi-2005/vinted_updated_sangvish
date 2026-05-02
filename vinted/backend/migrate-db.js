import { MongoClient } from 'mongodb';

const supportUri = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/test?appName=vinted';
const targetUri = 'mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted';

async function copyDatabase() {
    console.log('Connecting to databases...');
    const supportClient = new MongoClient(supportUri);
    const targetClient = new MongoClient(targetUri);

    try {
        await supportClient.connect();
        await targetClient.connect();
        
        const srcDb = supportClient.db('test');
        const targetDb = targetClient.db('vinted_db');

        console.log(`Source DB: ${srcDb.databaseName}`);
        console.log(`Target DB: ${targetDb.databaseName}`);

        // 1. Fetch the good email_settings from Target DB first!
        const emailSettingsDoc = await targetDb.collection('settings').findOne({ type: 'email_settings' });
        console.log(`Found target email settings: ${emailSettingsDoc ? 'YES' : 'NO'}`);

        // 2. Fetch Support email settings to keep its other things maybe? No, requested to merge.
        // Actually best is to just save the target's email_settings.

        // 3. Drop all target collections so we can clone exactly from Support
        console.log('Cleaning Target DB...');
        const targetCollections = await targetDb.listCollections().toArray();
        for (const coll of targetCollections) {
            await targetDb.collection(coll.name).drop();
            console.log(` - Dropped ${coll.name}`);
        }

        // 4. Copy all collections from Support to Target
        console.log('Copying documents from Support DB...');
        const srcCollections = await srcDb.listCollections().toArray();
        for (const coll of srcCollections) {
            if (coll.name === 'system.indexes') continue;
            
            const docs = await srcDb.collection(coll.name).find({}).toArray();
            if (docs.length > 0) {
                await targetDb.collection(coll.name).insertMany(docs);
                console.log(` + Copied ${docs.length} docs to ${coll.name}`);
            } else {
                // optionally create empty collection
                await targetDb.createCollection(coll.name);
            }
        }

        // 5. Restore the 'email_settings' document
        if (emailSettingsDoc) {
            console.log('Restoring Mail Concept settings into Target DB...');
            // Check if Support already had email_settings that we copied over
            await targetDb.collection('settings').updateOne(
                { type: 'email_settings' },
                { $set: emailSettingsDoc },
                { upsert: true }
            );
            console.log('✅ Mail concept successfully merged!');
        }

        console.log('🚀 SUCCESS: Support DB completely copied into Abinaya DB!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await supportClient.close();
        await targetClient.close();
    }
}

copyDatabase();
