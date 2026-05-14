import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function checkItemTypes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const itemTypes = await mongoose.connection.db.collection('itemtypes').find({}).limit(5).toArray();
        console.log('ItemTypes found:', itemTypes.length);
        itemTypes.forEach(it => {
            console.log(`Name: ${it.name?.en || it.name}, _id: ${it._id} (${typeof it._id}), subcategory_id: ${it.subcategory_id} (${typeof it.subcategory_id})`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkItemTypes();
