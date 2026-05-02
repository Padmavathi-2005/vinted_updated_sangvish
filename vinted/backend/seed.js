import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Item from './models/Item.js';
import Category from './models/Category.js';
import Subcategory from './models/Subcategory.js';
import Currency from './models/Currency.js';
import User from './models/User.js';
import Admin from './models/Admin.js';
import Language from './models/Language.js';
import Setting from './models/Setting.js';
import ItemType from './models/ItemType.js';
import bcrypt from 'bcryptjs';

const seedDB = async () => {
    try {
        const isLocal = process.env.NODE_ENV !== 'production';
        const dbUriToUse = isLocal ? (process.env.LOCAL_MONGO_URI || process.env.MONGO_URI) : process.env.MONGO_URI;
        
        console.log(`\n🔗 SEEDING: Connecting to ${isLocal ? 'LOCAL' : 'LIVE'} database...`);
        await mongoose.connect(dbUriToUse);
        console.log('✅ Connected successfully.');

        // 1. Clear existing data EXCEPT Categories (managed by seedCategories.js)
        const models = [
            User, Admin, Permission, AdminPermission,
            // Category, Subcategory, // Don't wipe these!
            Item, Order,
            Conversation, Message, Review, Favorite,
            Follow, Setting, Language, Currency
        ];

        // We might want to keep Currency/Language/Settings too if they are static?
        // For now let's wipe them to be safe, but NOT Categories.
        for (const model of models) {
            await model.deleteMany({});
        }

        const salt = await bcrypt.genSalt(10);

        // 2. Create Language
        const language = await Language.create({
            name: "English",
            code: "en",
            native_name: "English",
            direction: "ltr",
            flag: "🇺🇸",
            is_active: true,
        });
        console.log('Language Created');

        // 3. Create Currency (Use specific ID so Item can link/find it, or just create and use ref)
        const currency = await Currency.create({
            _id: new mongoose.Types.ObjectId("65d400000000000000000002"),
            name: "Indian Rupee",
            code: "INR",
            symbol: "₹",
            symbol_position: "before",
            exchange_rate: 83.25,
            country: "India",
            is_active: true
        });
        console.log('Currency Created');

        // 4. Create Settings
        await Setting.create({
            type: "admin_settings",
            admin_commission: 2,
            site_name: "My Marketplace",
            site_logo: "settings/logo.png",
            primary_color: "#0ea5e9",
            default_language_id: language._id,
            default_currency_id: currency._id,
            allow_registration: true,
        });
        console.log('Settings Created');

        // 5. Create Users
        const admin = await Admin.create({
            name: "Main Admin",
            email: "admin@gmail.com",
            password_hash: await bcrypt.hash('admin', salt),
            role: "admin",
            is_active: true,
        });

        const seller = await User.create({
            _id: new mongoose.Types.ObjectId("65d1a101a1b2345678900001"),
            username: "padma_style",
            email: "seller@email.com",
            password_hash: '12345678',
            role: "seller",
        });

        const buyer = await User.create({
            username: "priya_s",
            email: "buyer@email.com",
            password_hash: '12345678',
            role: "buyer",
        });

        // 6. Link to Categories (Find existing from seedCategories.js)
        // Ensure you ran seedCategories.js FIRST!
        let category = await Category.findOne({ name: 'Women' });
        if (!category) {
            console.log('⚠️ Categories not found. Creating fallback category...');
            category = await Category.create({ name: 'Women', slug: 'women' });
        }

        let subcategory = await Subcategory.findOne({ name: 'Clothing', category_id: category._id });
        if (!subcategory) {
            subcategory = await Subcategory.create({ name: 'Clothing', slug: 'clothing', category_id: category._id });
        }

        // Find an Item Type (Sub-subcategory)
        const ItemType = require('./models/ItemType');
        let itemType = await ItemType.findOne({ subcategory_id: subcategory._id, name: 'Jackets & Coats' });
        if (!itemType) {
            itemType = await ItemType.findOne({ subcategory_id: subcategory._id }); // First available
        }


        // 7. Create Item (with correct Currency ID)
        // 7. Create Multiple Items with Conditions and Dates
        const items = await Item.insertMany([
            {
                seller_id: seller._id,
                title: "Zara Denim Jacket",
                description: "Worn twice, excellent condition",
                category_id: category._id,
                subcategory_id: subcategory._id,
                item_type_id: itemType ? itemType._id : undefined,
                price: 1200,
                currency_id: currency._id,
                status: "active",
                negotiable: false,
                images: [],
                condition: "Very Good",
                created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
            },
            {
                seller_id: seller._id,
                title: "Nike Air Max",
                description: "Brand new in box",
                category_id: category._id,
                subcategory_id: subcategory._id,
                item_type_id: itemType ? itemType._id : undefined,
                price: 5000,
                currency_id: currency._id,
                status: "active",
                negotiable: true,
                images: [],
                condition: "New",
                created_at: new Date() // Now (New Badge should show)
            },
            {
                seller_id: seller._id,
                title: "Vintage T-Shirt",
                description: "Good condition, slight fade",
                category_id: category._id,
                subcategory_id: subcategory._id,
                item_type_id: itemType ? itemType._id : undefined,
                price: 450,
                currency_id: currency._id,
                status: "active",
                negotiable: true,
                images: [],
                condition: "Good",
                created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
            }
        ]);
        console.log(`Item Created with Currency ID: ${currency._id}`);

        console.log('🎉 Standard Seeding completed!');
        process.exit();
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
};

seedDB();
