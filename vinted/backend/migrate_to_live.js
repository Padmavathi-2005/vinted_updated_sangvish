
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const sourceUri = process.env.LOCAL_MONGO_URI;
const targetUri = process.env.MONGO_URI;

if (!sourceUri || !targetUri) {
    console.error('Missing LOCAL_MONGO_URI or MONGO_URI in .env');
    process.exit(1);
}

const migrate = async () => {
    let sourceConn, targetConn;
    try {
        console.log('--- DB Migration Started ---');
        
        // 1. Connect to Source
        console.log('Connecting to SOURCE database...');
        sourceConn = await mongoose.createConnection(sourceUri).asPromise();
        console.log('Connected to SOURCE.');

        // 2. Get all collections
        const collections = await sourceConn.db.listCollections().toArray();
        const allData = {};

        for (const col of collections) {
            const name = col.name;
            if (name === 'system.indexes') continue;
            console.log(`Reading collection: ${name}`);
            const data = await sourceConn.db.collection(name).find({}).toArray();
            allData[name] = data;
        }

        console.log('Data extraction complete.');
        await sourceConn.close();

        // 3. Connect to Target
        console.log('\nConnecting to TARGET database...');
        targetConn = await mongoose.createConnection(targetUri).asPromise();
        console.log('Connected to TARGET.');

        // 4. Restore data
        for (const [name, data] of Object.entries(allData)) {
            if (data.length === 0) {
                console.log(`Skipping empty collection: ${name}`);
                continue;
            }

            console.log(`Clearing collection in target: ${name}`);
            await targetConn.db.collection(name).deleteMany({});

            console.log(`Migrating ${data.length} documents into: ${name}`);
            
            // Map data to handle ObjectIds and Dates properly
            const processedData = data.map(doc => {
                // Ensure _id is preserved correctly
                return doc;
            });

            await targetConn.db.collection(name).insertMany(processedData);
        }

        console.log('\n--- Migration Completed Successfully! ---');
        await targetConn.close();
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
        process.exit(1);
    }
};

migrate();
