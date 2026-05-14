import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function checkSubcategories() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const subcats = await mongoose.connection.db.collection('subcategories').find({}).limit(5).toArray();
        console.log('Subcategories found:', subcats.length);
        subcats.forEach(s => {
            console.log(`Name: ${s.name?.en || s.name}, _id: ${s._id} (${typeof s._id}), category_id: ${s.category_id} (${typeof s.category_id})`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkSubcategories();
