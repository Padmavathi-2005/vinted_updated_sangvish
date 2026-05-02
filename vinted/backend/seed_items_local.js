import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Mongoose Models Setup
import Item from './models/Item.js';
import User from './models/User.js';
import Category from './models/Category.js';
import Subcategory from './models/Subcategory.js';
import Currency from './models/Currency.js';

const MONGO_URI = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;

const downloadImage = async (url, filename) => {
    const dir = path.join(__dirname, 'public', 'images', 'items');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filepath = path.join(dir, filename);
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // Handle redirects if present
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadImage(response.headers.location, filename).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
            }
            const stream = fs.createWriteStream(filepath);
            response.pipe(stream);
            stream.on('finish', () => {
                stream.close();
                resolve(`images/items/${filename}`);
            });
            stream.on('error', reject);
        }).on('error', reject);
    });
};

const seedNewItems = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        const seller = await User.findOne({});
        if (!seller) throw new Error("No user found to act as a seller.");

        const currency = await Currency.findOne({ code: 'USD' }) || await Currency.findOne({});
        if (!currency) throw new Error("No currency found.");

        const womenCat = await Category.findOne({ name: 'Women' });
        const menCat = await Category.findOne({ name: 'Men' });
        const elecCat = await Category.findOne({ name: 'Electronics' }) || await Category.findOne({});

        const womenSub = await Subcategory.findOne({ category_id: womenCat?._id }) || await Subcategory.findOne({});
        const menSub = await Subcategory.findOne({ category_id: menCat?._id }) || await Subcategory.findOne({});
        const elecSub = await Subcategory.findOne({ category_id: elecCat?._id }) || await Subcategory.findOne({});

        console.log("Downloading local images...");
        const womenImgPath = await downloadImage('https://picsum.photos/seed/dress/800/800', 'women_dress_123.jpg');
        const menImgPath = await downloadImage('https://picsum.photos/seed/jacket/800/800', 'men_shirt_123.jpg');
        const phoneImgPath = await downloadImage('https://picsum.photos/seed/phone/800/800', 'iphone_123.jpg');

        const newItems = [
            {
                seller_id: seller._id,
                title: 'Elegant Summer Floral Dress',
                description: 'Beautiful lightweight floral dress for the summer. Worn only a few times, excellent condition! Bought it last season but it no longer fits me. Perfect for garden parties or casual outings.',
                brand: 'Zara',
                size: 'M',
                color: 'Yellow Floral',
                condition: 'Very Good',
                price: 35.00,
                category_id: womenCat?._id || elecCat?._id,
                subcategory_id: womenSub?._id || elecSub?._id,
                currency_id: currency._id,
                negotiable: true,
                shipping_included: false,
                location: 'New York, USA',
                images: [womenImgPath],
                status: 'active',
                likes_count: 5,
                attributes: [
                    { key: 'Material', value: 'Cotton Blend' },
                    { key: 'Occasion', value: 'Casual / Summer' },
                    { key: 'When it was bought', value: 'Summer 2025' }
                ]
            },
            {
                seller_id: seller._id,
                title: 'Classic Denim Jacket',
                description: 'Vintage wash denim jacket for men. Essential wardrobe staple. Very durable and stylish. Selling because I bought a new one. Fits true to size.',
                brand: 'Levi\'s',
                size: 'L',
                color: 'Blue',
                condition: 'Good',
                price: 45.00,
                category_id: menCat?._id || elecCat?._id,
                subcategory_id: menSub?._id || elecSub?._id,
                currency_id: currency._id,
                negotiable: false, // "make an offer" effectively disabled or not negotiated
                shipping_included: true,
                location: 'Chicago, USA',
                images: [menImgPath],
                status: 'active',
                likes_count: 12,
                attributes: [
                    { key: 'Fit', value: 'Regular' },
                    { key: 'Style', value: 'Vintage Wash' },
                    { key: 'When it was bought', value: 'Winter 2024' }
                ]
            },
            {
                seller_id: seller._id,
                title: 'iPhone 13 Pro - 256GB Graphite',
                description: 'Selling my iPhone 13 Pro. It has been kept in a case with a screen protector since day one. Battery health is at 88%. Comes with the original box and charging cable. No scratches or dents.',
                brand: 'Apple',
                condition: 'Very Good',
                price: 650.00,
                category_id: elecCat?._id || womenCat?._id,
                subcategory_id: elecSub?._id || womenSub?._id,
                currency_id: currency._id,
                negotiable: true, // "Make an offer" = Yes
                shipping_included: false,
                location: 'San Francisco, USA',
                images: [phoneImgPath],
                status: 'active',
                likes_count: 34,
                attributes: [
                    { key: 'Storage Capacity', value: '256GB' },
                    { key: 'Battery Health', value: '88%' },
                    { key: 'When it was bought', value: 'October 2021' },
                    { key: 'Warranty Remaining', value: 'None' }
                ]
            }
        ];

        console.log("Inserting new items...");
        for (const itemData of newItems) {
            const i = new Item(itemData);
            await i.save();
            console.log(`Inserted: ${i.title}`);
        }

        console.log("Seeding completely successfully!");
        process.exit();
    } catch (err) {
        console.error("Error seeding new items:", err);
        process.exit(1);
    }
};

seedNewItems();
