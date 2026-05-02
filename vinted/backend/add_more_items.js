import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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

const addItemData = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        const seller = await User.findOne({ email: 'seller@email.com' });
        if (!seller) throw new Error("Seller seller@email.com not found.");

        const currency = await Currency.findOne({ code: 'USD' }) || await Currency.findOne({});
        if (!currency) throw new Error("No currency found.");

        const categories = await Category.find({});
        if (categories.length === 0) throw new Error("No categories found.");

        console.log(`Found ${categories.length} categories. Generating 20 items...`);

        const conditions = ['New', 'Very Good', 'Good', 'Normal'];
        const brands = ['Nike', 'Adidas', 'Zara', 'H&M', 'Levi\'s', 'Apple', 'Samsung', 'Sony', 'Gucci', 'Prada'];

        for (let i = 1; i <= 20; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const subcategory = await Subcategory.findOne({ category_id: category._id }) || await Subcategory.findOne({});
            
            if (!subcategory) {
                console.log(`Skipping item ${i} as no subcategory found for ${category.name}`);
                continue;
            }

            const brand = brands[Math.floor(Math.random() * brands.length)];
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            const price = Math.floor(Math.random() * 200) + 10;
            
            const imageName = `extra_item_${Date.now()}_${i}.jpg`;
            const imageUrl = `https://picsum.photos/seed/${imageName}/800/800`;
            const imagePath = await downloadImage(imageUrl, imageName);

            const newItem = new Item({
                seller_id: seller._id,
                title: `${brand} ${category.name} Item #${i}`,
                description: `High quality ${category.name} item from ${brand}. This is a specially seeded item for testing purposes. Condition is ${condition}.`,
                brand: brand,
                size: ['S', 'M', 'L', 'XL', 'One Size'][Math.floor(Math.random() * 5)],
                color: ['Black', 'White', 'Blue', 'Red', 'Green'][Math.floor(Math.random() * 5)],
                condition: condition,
                price: price,
                original_price: price + Math.floor(Math.random() * 50),
                category_id: category._id,
                subcategory_id: subcategory._id,
                currency_id: currency._id,
                negotiable: Math.random() > 0.5,
                shipping_included: Math.random() > 0.7,
                location: 'Main Terminal, City Center',
                images: [imagePath],
                status: 'active',
                likes_count: Math.floor(Math.random() * 20),
                views_count: Math.floor(Math.random() * 100),
                attributes: [
                    { key: 'Seeded', value: 'Yes' },
                    { key: 'Collection', value: 'Spring 2026' }
                ]
            });

            await newItem.save();
            console.log(`[${i}/20] Created: ${newItem.title} in ${category.name}`);
        }

        console.log("20 items added successfully!");
        process.exit();
    } catch (err) {
        console.error("Error adding items:", err);
        process.exit(1);
    }
};

addItemData();
