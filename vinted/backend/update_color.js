
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const updateColor = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const result = await mongoose.connection.db.collection('settings').updateOne(
            { type: 'general_settings' },
            { $set: { primary_color: '#0ea5e9' } }
        );
        
        console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        console.log('Primary color updated to #0ea5e9 in database.');
        process.exit(0);
    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
};

updateColor();
