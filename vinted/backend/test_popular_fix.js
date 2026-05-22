
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Item from './models/Item.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const testPopularItems = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const queryObj = { 
            status: { $in: ['active', 'available'] }, 
            is_deleted: false, 
            is_sold: { $ne: true },
            is_ordered: { $ne: true }
        };

        let pipeline = [{ $match: queryObj }];

        // Join currency
        pipeline.push(
            { $lookup: { from: 'currencies', localField: 'currency_id', foreignField: '_id', as: 'curr' } },
            { $unwind: '$curr' },
            {
                $addFields: {
                    convertedPrice: {
                        $multiply: [
                            { $divide: [{ $toDouble: { $ifNull: ["$price", 0] } }, { $ifNull: ['$curr.exchange_rate', 1] }] },
                            1
                        ]
                    }
                }
            }
        );

        // Sorting
        pipeline.push(
            { $lookup: { from: 'users', localField: 'seller_id', foreignField: '_id', as: 'seller' } },
            { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    popularityScore: {
                        $add: [
                            { $multiply: [{ $toDouble: { $ifNull: ['$views_count', 0] } }, 1] },
                            { $multiply: [{ $toDouble: { $ifNull: ['$likes_count', 0] } }, 5] },
                            { $multiply: [{ $toDouble: { $ifNull: ['$seller.rating_avg', 0] } }, 10] }
                        ]
                    }
                }
            },
            { $sort: { popularityScore: -1 } },
            { $limit: 5 }
        );

        const results = await Item.aggregate(pipeline);
        console.log(`📊 Popular items found: ${results.length}`);
        results.forEach(item => {
            console.log(`- ${item.title} (Score: ${item.popularityScore})`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testPopularItems();
