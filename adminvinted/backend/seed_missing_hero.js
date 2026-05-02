import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const FrontendContentSchema = new mongoose.Schema({
    section: String,
    key: String,
    values: {
        type: Map,
        of: String
    }
}, { timestamps: true });

const FrontendContent = mongoose.model('FrontendContent', FrontendContentSchema);

const seedHeroImage = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const heroImageKey = { section: 'home', key: 'hero_image' };
        const existing = await FrontendContent.findOne(heroImageKey);

        if (!existing) {
            await FrontendContent.create({
                ...heroImageKey,
                values: {
                    en: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1200&q=80'
                }
            });
            console.log('Hero image field seeded successfully!');
        } else {
            console.log('Hero image field already exists.');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding hero image:', error);
        process.exit(1);
    }
};

seedHeroImage();
