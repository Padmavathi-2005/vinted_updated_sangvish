import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function checkClusterActive() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const women = await mongoose.connection.db.collection('categories').findOne({ slug: 'women' });
        
        if (women) {
            const subcats = await mongoose.connection.db.collection('subcategories').find({ category_id: women._id }).toArray();
            subcats.forEach(s => {
                console.log(`Sub: ${s.name}, is_active: ${s.is_active}, type: ${typeof s.is_active}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkClusterActive();
