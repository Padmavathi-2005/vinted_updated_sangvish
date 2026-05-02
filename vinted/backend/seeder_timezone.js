import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Timezone from './models/Timezone.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedTimezones = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        // Get all IANA timezones (Available in Node 14+)
        // Get all IANA timezones (Available in Node 14+)
        let zones = Intl.supportedValuesOf('timeZone');
        
        // Ensure UTC is included (sometimes omitted by Intl)
        if (!zones.includes('UTC')) {
            zones.push('UTC');
        }
        
        const timezoneData = zones.map(zone => {
            return {
                name: zone,
                offset: 'UTC' 
            };
        });

        // Clear existing
        await Timezone.deleteMany({});
        
        // Insert all
        await Timezone.insertMany(timezoneData);

        console.log(`Successfully seeded ${zones.length} timezones!`);
        process.exit();
    } catch (error) {
        console.error('Error seeding timezones:', error);
        process.exit(1);
    }
};

seedTimezones();
