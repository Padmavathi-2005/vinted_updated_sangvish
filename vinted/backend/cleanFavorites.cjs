const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const FavoriteSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }
});

const ItemSchema = new mongoose.Schema({}); // We only need it to check existence

async function run() {
    try {
        console.log('Connecting to DB...', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const Favorite = mongoose.model('Favorite', FavoriteSchema);
        const Item = mongoose.model('Item', ItemSchema);

        const favorites = await Favorite.find({});
        console.log(`Found ${favorites.length} total favorites.`);

        let deletedCount = 0;

        for (const fav of favorites) {
            const item = await Item.findById(fav.item_id);
            if (!item) {
                console.log(`Found orphan favorite ${fav._id} for item ${fav.item_id}. Deleting...`);
                await Favorite.findByIdAndDelete(fav._id);
                deletedCount++;
            }
        }

        console.log(`Cleanup complete. Deleted ${deletedCount} orphaned favorites.`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
