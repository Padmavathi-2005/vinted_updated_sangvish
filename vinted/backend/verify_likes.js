const mongoose = require('mongoose');
require('dotenv').config();
const Favorite = require('./models/Favorite');
const Item = require('./models/Item');

const verifyCounts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vinted');
        console.log('Connected to DB');

        const favs = await Favorite.find();
        console.log(`Total Favorites in DB: ${favs.length}`);

        // Aggregate counts per item from Favorites collection
        const countsFromFavs = await Favorite.aggregate([
            { $group: { _id: '$item_id', count: { $sum: 1 } } }
        ]);

        console.log('\nDiscrepancies found:');
        for (const f of countsFromFavs) {
            const item = await Item.findById(f._id);
            if (item) {
                if (item.likes_count !== f.count) {
                    console.log(`Item "${item.title}" (ID: ${item._id}): Expected ${f.count} likes, found ${item.likes_count}`);
                }
            } else {
                console.log(`Favorite exists for non-existent Item ID: ${f._id}`);
            }
        }

        const itemsWithLikes = await Item.find({ likes_count: { $gt: 0 } });
        console.log(`\nItems with likes_count > 0 in Items table: ${itemsWithLikes.length}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verifyCounts();
