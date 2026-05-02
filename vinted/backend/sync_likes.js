const mongoose = require('mongoose');
require('dotenv').config();
const Favorite = require('./models/Favorite');
const Item = require('./models/Item');

const syncLikes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vinted');
        console.log('Connected to DB');

        console.log('Resetting all likes_count to 0...');
        await Item.updateMany({}, { $set: { likes_count: 0 } });

        console.log('Recalculating likes from Favorites collection...');
        const counts = await Favorite.aggregate([
            { $group: { _id: '$item_id', count: { $sum: 1 } } }
        ]);

        for (const c of counts) {
            await Item.findByIdAndUpdate(c._id, { $set: { likes_count: c.count } });
            console.log(`Updated Item ${c._id} with ${c.count} likes`);
        }

        console.log('Sync complete!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

syncLikes();
