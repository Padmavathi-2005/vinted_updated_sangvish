import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function debugSubcategories() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
        console.log('--- Categories ---');
        categories.forEach(c => {
            const name = typeof c.name === 'object' ? (c.name.en || Object.values(c.name)[0]) : c.name;
            console.log(`Cat: ${name}, _id: ${c._id}`);
        });

        const womenCat = categories.find(c => {
            const name = typeof c.name === 'object' ? (c.name.en || Object.values(c.name)[0]) : c.name;
            return name === 'Women';
        });

        if (womenCat) {
            console.log(`\n--- Subcategories for Women (${womenCat._id}) ---`);
            const subcats = await mongoose.connection.db.collection('subcategories').find({ category_id: womenCat._id }).toArray();
            console.log(`Found ${subcats.length} subcategories.`);
            subcats.forEach(s => {
                const name = typeof s.name === 'object' ? (s.name.en || Object.values(s.name)[0]) : s.name;
                console.log(`  Sub: ${name}, is_active: ${s.is_active}`);
            });
            
            if (subcats.length === 0) {
                console.log('\nTrying string match for category_id...');
                const subcatsStr = await mongoose.connection.db.collection('subcategories').find({ category_id: womenCat._id.toString() }).toArray();
                console.log(`Found ${subcatsStr.length} subcategories with string category_id.`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
debugSubcategories();
