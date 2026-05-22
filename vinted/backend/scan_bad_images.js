
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const checkAllImages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const items = await mongoose.connection.db.collection('items').find({}).toArray();
        let badCount = 0;
        
        items.forEach(item => {
            if (item.images && Array.isArray(item.images)) {
                item.images.forEach((img, i) => {
                    if (typeof img !== 'string') {
                        badCount++;
                        console.log(`Bad Image in [${item.title}]: Index ${i}, Type ${typeof img}, Value: ${JSON.stringify(img)}`);
                    }
                });
            }
        });
        
        console.log(`\nScan complete. Total bad images found: ${badCount}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkAllImages();
