import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const verify = async () => {
    try {
        const isLocal = process.env.NODE_ENV !== 'production';
        const liveUri = process.env.MONGO_URI;
        const localUri = process.env.LOCAL_MONGO_URI;
        const dbUriToUse = isLocal ? localUri : liveUri;

        await mongoose.connect(dbUriToUse);
        const db = mongoose.connection.db;

        const cookieSettings = await db.collection('settings').findOne({ type: 'cookie_settings' });
        console.log('Final Cookie Settings:', JSON.stringify(cookieSettings, null, 2));

        const siteSettings = await db.collection('settings').findOne({ type: 'site_settings' });
        console.log('Final Site Settings:', JSON.stringify(siteSettings, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

verify();
