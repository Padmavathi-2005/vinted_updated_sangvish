import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

import connectDB from './backend/config/db.js';
import Report from './backend/models/Report.js';

connectDB().then(async () => {
    const reports = await Report.find({});
    console.log("REPORTS COUNT:", reports.length);
    console.log("REPORTS:", reports);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
