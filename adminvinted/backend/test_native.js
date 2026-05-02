import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await client.connect();

        console.log("Pinging database...");
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const db = client.db("vinted_db");
        const count = await db.collection("categories").countDocuments();
        console.log("Categories count:", count);

    } finally {
        await client.close();
    }
}
run().catch(console.dir);
