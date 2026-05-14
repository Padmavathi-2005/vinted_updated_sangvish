import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function checkCluster() {
    try {
        console.log('Connecting to Cluster:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const cats = await mongoose.connection.db.collection('categories').find({}).toArray();
        console.log('Categories found:', cats.length);
        const women = cats.find(c => c.slug === 'women');
        
        if (women) {
            console.log(`Women Category: ${women._id}`);
            const subcats = await mongoose.connection.db.collection('subcategories').find({ category_id: women._id }).toArray();
            console.log(`Subcategories found for Women (with ObjectId): ${subcats.length}`);
            
            const subcatsStr = await mongoose.connection.db.collection('subcategories').find({ category_id: women._id.toString() }).toArray();
            console.log(`Subcategories found for Women (with String): ${subcatsStr.length}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkCluster();
