import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import Subcategory from './models/Subcategory.js';

dotenv.config({ path: './.env' });

async function testMongooseMatch() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const cat = await Category.findOne({ slug: 'women' });
        if (!cat) {
            console.log('Category women not found');
            process.exit(0);
        }
        
        console.log(`Women Category: ${cat.name}, _id: ${cat._id} (${typeof cat._id}), isObjectId: ${cat._id instanceof mongoose.Types.ObjectId}`);
        
        const subcats = await Subcategory.find({ category_id: cat._id });
        console.log(`Found ${subcats.length} subcategories via Mongoose find({ category_id: cat._id })`);
        
        const subcatsRaw = await mongoose.connection.db.collection('subcategories').find({ category_id: cat._id }).toArray();
        console.log(`Found ${subcatsRaw.length} subcategories via Native DB find({ category_id: cat._id })`);

        const subcatsStr = await mongoose.connection.db.collection('subcategories').find({ category_id: cat._id.toString() }).toArray();
        console.log(`Found ${subcatsStr.length} subcategories via Native DB find({ category_id: cat._id.toString() })`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testMongooseMatch();
