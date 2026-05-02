import { MongoClient } from 'mongodb';

const sourceUri = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";
const targetUri = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";

async function migrate() {
    console.log("Connecting to databases...");
    // Family 4 forces IPv4, which can sometimes resolve DNS/TLS issues on Windows
    const sourceClient = new MongoClient(sourceUri, { family: 4, serverSelectionTimeoutMS: 30000 });
    const targetClient = new MongoClient(targetUri, { family: 4, serverSelectionTimeoutMS: 30000 });

    try {
        await sourceClient.connect();
        console.log("✅ Connected to SOURCE database.");
    } catch (e) {
        console.error("❌ Failed to connect to SOURCE database. Did you whitelist the IP?");
        console.error(e.message);
        return;
    }

    try {
        await targetClient.connect();
        console.log("✅ Connected to TARGET database.");
    } catch (e) {
        console.error("❌ Failed to connect to TARGET database. Did you whitelist the IP?");
        console.error(e.message);
        return;
    }

    try {
        console.log("Preparing to transfer data from 'vinted_db'...");
        const sourceDb = sourceClient.db("vinted_db");
        const targetDb = targetClient.db("vinted_db");

        const collections = await sourceDb.listCollections().toArray();

        for (const col of collections) {
            const colName = col.name;
            if (colName.startsWith('system.')) continue;

            console.log(`[${colName}] Deleting existing data in TARGET...`);
            await targetDb.collection(colName).deleteMany({}).catch(() => { });

            console.log(`[${colName}] Fetching from SOURCE...`);
            const docs = await sourceDb.collection(colName).find({}).toArray();

            if (docs.length > 0) {
                console.log(`[${colName}] Inserting ${docs.length} documents into TARGET...`);
                // Insert in batches of 500 to prevent payload too large errors
                for (let i = 0; i < docs.length; i += 500) {
                    const batch = docs.slice(i, i + 500);
                    await targetDb.collection(colName).insertMany(batch);
                }
                console.log(`[${colName}] Insert successful!`);
            } else {
                console.log(`[${colName}] Collection is empty. Recreated as empty.`);
            }
        }
        console.log("\n🎉 MIGRATION COMPLETELY FINISHED! All data has been perfectly copied!");
    } catch (e) {
        console.error("MIGRATION ERROR:", e);
    } finally {
        await sourceClient.close();
        await targetClient.close();
    }
}

migrate();
