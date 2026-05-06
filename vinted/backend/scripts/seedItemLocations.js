/**
 * One-time migration script
 * Seeds lat, lng, location, location_label for all existing items that are missing map data.
 *
 * Usage: node scripts/seedItemLocations.js
 *        (Run from the backend directory)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// ──────────────────────────────────────────────────────────────────────────────
// Pool of real Indian city locations to distribute across items randomly
// ──────────────────────────────────────────────────────────────────────────────
const CITY_POOL = [
    { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, location_label: 'Mumbai, Maharashtra, India' },
    { city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090, location_label: 'New Delhi, Delhi, India' },
    { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, location_label: 'Bengaluru, Karnataka, India' },
    { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, location_label: 'Hyderabad, Telangana, India' },
    { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, location_label: 'Chennai, Tamil Nadu, India' },
    { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, location_label: 'Kolkata, West Bengal, India' },
    { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, location_label: 'Pune, Maharashtra, India' },
    { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, location_label: 'Ahmedabad, Gujarat, India' },
    { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, location_label: 'Jaipur, Rajasthan, India' },
    { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, location_label: 'Lucknow, Uttar Pradesh, India' },
    { city: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, location_label: 'Surat, Gujarat, India' },
    { city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319, location_label: 'Kanpur, Uttar Pradesh, India' },
    { city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, location_label: 'Nagpur, Maharashtra, India' },
    { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, location_label: 'Coimbatore, Tamil Nadu, India' },
    { city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, location_label: 'Kochi, Kerala, India' },
    { city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, location_label: 'Bhopal, Madhya Pradesh, India' },
    { city: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, location_label: 'Indore, Madhya Pradesh, India' },
    { city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, location_label: 'Visakhapatnam, Andhra Pradesh, India' },
    { city: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794, location_label: 'Chandigarh, Punjab, India' },
    { city: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, location_label: 'Patna, Bihar, India' },
];

// Adds a small random offset (±0.02°) so items in the same city don't stack exactly
const jitter = (coord) => coord + (Math.random() - 0.5) * 0.04;

const run = async () => {
    try {
        await connectDB();
        console.log('\n🗺️  Starting item location seeding...\n');

        // Find ALL items to ensure they have the new components (country, state, etc)
        const items = await Item.find({});

        console.log(`📦 Found ${items.length} items to check/update.`);

        let updated = 0;
        for (const item of items) {
            // Pick a city from the pool — cycle through them so distribution is even
            const cityData = CITY_POOL[updated % CITY_POOL.length];

            const lat = item.lat || jitter(cityData.lat);
            const lng = item.lng || jitter(cityData.lng);
            const location_label = item.location_label || cityData.location_label;
            const location = item.location || cityData.city;

            await Item.findByIdAndUpdate(item._id, {
                lat,
                lng,
                location,
                location_label,
                country: 'India',
                state: cityData.state,
                city: cityData.city,
                pincode: (400001 + (updated % 50)).toString() // Dummy pincodes
            });

            updated++;
            if (updated % 10 === 0) {
                console.log(`  ✔ ${updated}/${items.length} items updated...`);
            }
        }

        console.log(`\n✅ Done! Successfully synchronized ${updated} items with full location components.\n`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
};

run();
