import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function checkSlugs() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const cats = await mongoose.connection.db.collection('categories').find({}).toArray();
        cats.forEach(c => {
            console.log(`Name: ${JSON.stringify(c.name)}, Slug: ${c.slug}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkSlugs();
