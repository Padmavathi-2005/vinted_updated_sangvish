import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinted';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const favs = await db.collection('favorites').find({}).toArray();
  const seenFavs = new Set();
  for (const f of favs) {
    const key = f.user_id + '_' + f.item_id;
    if (seenFavs.has(key)) {
      await db.collection('favorites').deleteOne({ _id: f._id });
      // Decrement likes count on item to be safe!
      await db.collection('items').updateOne({ _id: f.item_id }, { $inc: { likes_count: -1 } });
    } else {
      seenFavs.add(key);
    }
  }
  await db.collection('favorites').createIndex({ user_id: 1, item_id: 1 }, { unique: true });

  const revs = await db.collection('reviews').find({}).toArray();
  const seenRevs = new Set();
  for (const r of revs) {
    const key = r.order_id + '_' + r.reviewer_id;
    if (seenRevs.has(key)) {
      await db.collection('reviews').deleteOne({ _id: r._id });
    } else {
      seenRevs.add(key);
    }
  }
  await db.collection('reviews').createIndex({ order_id: 1, reviewer_id: 1 }, { unique: true });

  try {
    await db.collection('itemviews').dropIndex('item_id_1_ip_address_1');
  } catch(e) {}

  console.log('Indexes and counts fixed!');
  process.exit(0);
}
run();
