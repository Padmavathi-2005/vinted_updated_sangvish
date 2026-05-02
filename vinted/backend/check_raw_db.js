import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function check() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db();
        const convs = await db.collection('conversations').find({}).toArray();
        console.log('RAW CONVERSATIONS:');
        console.log(JSON.stringify(convs, null, 2));
        
        const users = await db.collection('users').find({}).limit(1).toArray();
        console.log('RAW SAMPLE USER:');
        console.log(JSON.stringify(users, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
        process.exit(0);
    }
}

check();
