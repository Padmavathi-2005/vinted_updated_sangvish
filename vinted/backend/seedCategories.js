/**
 * Category Seed Script
 * Seeds all 9 top-level categories, their subcategories (left panel),
 * and sub-subcategories (right panel) — matching Vinted's structure.
 *
 * Run with: node backend/seedCategories.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Category from './models/Category.js';
import Subcategory from './models/Subcategory.js';
import ItemType from './models/ItemType.js';

// ─── Helper ────────────────────────────────────────────────
const slug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── Full Category Tree ────────────────────────────────────
// Structure: { name, icon, subcategories: [{ name, icon, items: [string] }] }
const CATEGORY_TREE = [
    {
        name: 'Women',
        icon: '👗',
        sort_order: 1,
        subcategories: [
            {
                name: 'Clothing',
                icon: '👕',
                sort_order: 1,
                items: ['Dresses', 'Tops & T-shirts', 'Blouses & Tunics', 'Jeans', 'Trousers & Chinos', 'Shorts', 'Skirts', 'Coats & Jackets', 'Knitwear & Sweatshirts', 'Suits & Blazers', 'Lingerie & Nightwear', 'Swimwear', 'Activewear', 'Jumpsuits & Playsuits', 'Maternity'],
            },
            {
                name: 'Shoes',
                icon: '👠',
                sort_order: 2,
                items: ['Heels', 'Flats', 'Boots & Ankle Boots', 'Trainers & Sneakers', 'Sandals', 'Loafers & Moccasins', 'Wedges', 'Slippers', 'Espadrilles'],
            },
            {
                name: 'Bags',
                icon: '👜',
                sort_order: 3,
                items: ['Handbags', 'Shoulder Bags', 'Crossbody Bags', 'Backpacks', 'Clutches & Evening Bags', 'Tote Bags', 'Wallets & Purses', 'Travel Bags'],
            },
            {
                name: 'Accessories',
                icon: '💍',
                sort_order: 4,
                items: ['Jewellery', 'Watches', 'Sunglasses', 'Scarves & Shawls', 'Hats & Caps', 'Belts', 'Hair Accessories', 'Gloves', 'Umbrellas'],
            },
            {
                name: 'Beauty',
                icon: '💄',
                sort_order: 5,
                items: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Nail Care', 'Body Care', 'Tools & Brushes'],
            },
        ],
    },
    {
        name: 'Men',
        icon: '👔',
        sort_order: 2,
        subcategories: [
            {
                name: 'Clothing',
                icon: '👕',
                sort_order: 1,
                items: ['T-shirts & Polos', 'Shirts', 'Jeans', 'Trousers & Chinos', 'Shorts', 'Coats & Jackets', 'Knitwear & Sweatshirts', 'Suits & Blazers', 'Activewear', 'Underwear & Socks', 'Swimwear'],
            },
            {
                name: 'Shoes',
                icon: '👟',
                sort_order: 2,
                items: ['Trainers & Sneakers', 'Boots', 'Loafers & Moccasins', 'Oxford & Derby', 'Sandals & Flip Flops', 'Slippers', 'Formal Shoes'],
            },
            {
                name: 'Accessories',
                icon: '🕶️',
                sort_order: 3,
                items: ['Watches', 'Sunglasses', 'Wallets', 'Belts', 'Ties & Bow Ties', 'Hats & Caps', 'Scarves', 'Cufflinks', 'Bags & Backpacks'],
            },
            {
                name: 'Grooming',
                icon: '🪒',
                sort_order: 4,
                items: ['Skincare', 'Shaving & Beard', 'Fragrance', 'Haircare', 'Body Care'],
            },
        ],
    },
    {
        name: 'Designer',
        icon: '✨',
        sort_order: 3,
        subcategories: [
            {
                name: 'Designer Women',
                icon: '👗',
                sort_order: 1,
                items: ['Clothing', 'Shoes', 'Bags & Handbags', 'Accessories', 'Jewellery', 'Watches', 'Sunglasses', 'Scarves'],
            },
            {
                name: 'Designer Men',
                icon: '👔',
                sort_order: 2,
                items: ['Clothing', 'Shoes', 'Bags & Accessories', 'Watches', 'Sunglasses', 'Ties & Pocket Squares'],
            },
            {
                name: 'Luxury Brands',
                icon: '💎',
                sort_order: 3,
                items: ['Gucci', 'Louis Vuitton', 'Chanel', 'Prada', 'Hermès', 'Dior', 'Versace', 'Burberry', 'Balenciaga', 'Saint Laurent'],
            },
        ],
    },
    {
        name: 'Kids',
        icon: '🧒',
        sort_order: 4,
        subcategories: [
            {
                name: "Girls' Clothing",
                icon: '👧',
                sort_order: 1,
                items: ['Dresses', 'Tops & T-shirts', 'Trousers & Jeans', 'Skirts', 'Coats & Jackets', 'Knitwear & Sweatshirts', 'Swimwear', 'Nightwear', 'School Uniform'],
            },
            {
                name: "Boys' Clothing",
                icon: '👦',
                sort_order: 2,
                items: ['T-shirts & Polos', 'Shirts', 'Trousers & Jeans', 'Shorts', 'Coats & Jackets', 'Knitwear & Sweatshirts', 'Swimwear', 'Nightwear', 'School Uniform'],
            },
            {
                name: 'Shoes',
                icon: '👟',
                sort_order: 3,
                items: ['Trainers & Sneakers', 'Boots', 'Sandals', 'School Shoes', 'Slippers', 'Wellies'],
            },
            {
                name: 'Toys',
                icon: '🧸',
                sort_order: 4,
                items: ['Action Figures', 'Dolls', 'Building & Construction', 'Board Games', 'Outdoor Toys', 'Educational Toys', 'Soft Toys & Plush', 'Remote Control Toys'],
            },
            {
                name: 'Strollers & Prams',
                icon: '🍼',
                sort_order: 5,
                items: ['Prams', 'Strollers', 'Pushchairs', 'Travel Systems', 'Accessories'],
            },
            {
                name: 'Baby',
                icon: '👶',
                sort_order: 6,
                items: ['Baby Clothing (0-24m)', 'Nursery', 'Feeding', 'Changing', 'Baby Monitors', 'Car Seats'],
            },
        ],
    },
    {
        name: 'Home',
        icon: '🏠',
        sort_order: 5,
        subcategories: [
            {
                name: 'Furniture',
                icon: '🛋️',
                sort_order: 1,
                items: ['Sofas & Armchairs', 'Beds & Bed Frames', 'Tables', 'Chairs', 'Storage & Wardrobes', 'Shelving & Bookcases', 'Desks', 'Garden Furniture'],
            },
            {
                name: 'Home Décor',
                icon: '🖼️',
                sort_order: 2,
                items: ['Wall Art & Prints', 'Mirrors', 'Candles & Holders', 'Vases & Planters', 'Cushions & Throws', 'Rugs', 'Clocks', 'Photo Frames'],
            },
            {
                name: 'Kitchen & Dining',
                icon: '🍽️',
                sort_order: 3,
                items: ['Cookware', 'Bakeware', 'Cutlery', 'Crockery & Dinnerware', 'Glassware', 'Kitchen Appliances', 'Storage & Organisation', 'Tablecloths & Placemats'],
            },
            {
                name: 'Bedding & Bath',
                icon: '🛏️',
                sort_order: 4,
                items: ['Duvet Sets', 'Pillows', 'Blankets & Throws', 'Towels', 'Mattress Toppers', 'Curtains & Blinds'],
            },
            {
                name: 'Garden & Outdoor',
                icon: '🌿',
                sort_order: 5,
                items: ['Garden Tools', 'Plant Pots & Planters', 'BBQ & Outdoor Cooking', 'Outdoor Lighting', 'Garden Décor'],
            },
            {
                name: 'Lighting',
                icon: '💡',
                sort_order: 6,
                items: ['Ceiling Lights', 'Table Lamps', 'Floor Lamps', 'Wall Lights', 'Outdoor Lighting', 'LED Strips'],
            },
        ],
    },
    {
        name: 'Electronics',
        icon: '💻',
        sort_order: 6,
        subcategories: [
            {
                name: 'Video Games & Consoles',
                icon: '🎮',
                sort_order: 1,
                items: ['Games', 'Consoles', 'Gaming Headsets', 'Controllers', 'Virtual Reality', 'Simulators', 'Accessories'],
            },
            {
                name: 'Computers & Accessories',
                icon: '🖥️',
                sort_order: 2,
                items: ['Laptops', 'Desktop PCs', 'Monitors', 'Keyboards & Mice', 'Hard Drives & SSDs', 'RAM & Memory', 'Graphics Cards', 'Webcams', 'Printers'],
            },
            {
                name: 'Cell Phones & Communication',
                icon: '📱',
                sort_order: 3,
                items: ['Smartphones', 'Cases & Covers', 'Screen Protectors', 'Chargers & Cables', 'Power Banks', 'SIM Cards'],
            },
            {
                name: 'Audio, Headphones & Hi-Fi',
                icon: '🎧',
                sort_order: 4,
                items: ['Headphones', 'Earphones & Earbuds', 'Bluetooth Speakers', 'Hi-Fi Systems', 'Soundbars', 'Microphones', 'Vinyl & Record Players'],
            },
            {
                name: 'Cameras & Accessories',
                icon: '📷',
                sort_order: 5,
                items: ['DSLR Cameras', 'Mirrorless Cameras', 'Action Cameras', 'Lenses', 'Tripods', 'Camera Bags', 'Memory Cards', 'Drones'],
            },
            {
                name: 'Tablets, E-readers & Accessories',
                icon: '📲',
                sort_order: 6,
                items: ['Tablets', 'E-readers', 'Tablet Cases', 'Styluses', 'Keyboards for Tablets'],
            },
            {
                name: 'TV & Home Theater',
                icon: '📺',
                sort_order: 7,
                items: ['TVs', 'Projectors', 'Streaming Devices', 'Remote Controls', 'TV Mounts & Stands'],
            },
            {
                name: 'Wearables',
                icon: '⌚',
                sort_order: 8,
                items: ['Smartwatches', 'Fitness Trackers', 'Smart Glasses', 'Wearable Cameras'],
            },
            {
                name: 'Beauty & Personal Care Electronics',
                icon: '💅',
                sort_order: 9,
                items: ['Hair Dryers', 'Straighteners', 'Electric Shavers', 'Electric Toothbrushes', 'Massagers'],
            },
        ],
    },
    {
        name: 'Entertainment',
        icon: '🎬',
        sort_order: 7,
        subcategories: [
            {
                name: 'Books',
                icon: '📚',
                sort_order: 1,
                items: ['Fiction', 'Non-Fiction', 'Children\'s Books', 'Textbooks & Education', 'Comics & Graphic Novels', 'Cookbooks', 'Travel & Geography', 'Self-Help & Wellbeing'],
            },
            {
                name: 'Magazines',
                icon: '📰',
                sort_order: 2,
                items: ['Fashion & Beauty', 'Sport & Fitness', 'Technology', 'Home & Garden', 'Travel', 'News & Current Affairs', 'Food & Drink'],
            },
            {
                name: 'Music',
                icon: '🎵',
                sort_order: 3,
                items: ['Vinyl Records', 'CDs', 'Cassettes', 'Music Memorabilia', 'Sheet Music', 'Music Accessories'],
            },
            {
                name: 'Video',
                icon: '🎥',
                sort_order: 4,
                items: ['DVDs', 'Blu-rays', 'VHS', '4K UHD', 'Box Sets', 'Documentaries'],
            },
            {
                name: 'Musical Instruments',
                icon: '🎸',
                sort_order: 5,
                items: ['Guitars', 'Keyboards & Pianos', 'Drums & Percussion', 'Wind Instruments', 'String Instruments', 'DJ Equipment', 'Recording Equipment'],
            },
        ],
    },
    {
        name: 'Hobbies & Collectibles',
        icon: '🎲',
        sort_order: 8,
        subcategories: [
            {
                name: 'Trading Cards',
                icon: '🃏',
                sort_order: 1,
                items: ['Booster Packs', 'Card Decks', 'Single Trading Cards', 'Booster Boxes', 'Uncut Card Sheets', 'Trading Card Lots'],
            },
            {
                name: 'Board Games',
                icon: '♟️',
                sort_order: 2,
                items: ['Strategy Games', 'Family Games', 'Party Games', 'Card Games', 'Puzzle Games', 'Cooperative Games'],
            },
            {
                name: 'Puzzles',
                icon: '🧩',
                sort_order: 3,
                items: ['Jigsaw Puzzles', '3D Puzzles', 'Brain Teasers', 'Metal Puzzles'],
            },
            {
                name: 'Tabletop & Miniature Gaming',
                icon: '🎯',
                sort_order: 4,
                items: ['Miniatures', 'Terrain & Scenery', 'Paints & Tools', 'Rulebooks'],
            },
            {
                name: 'Memorabilia',
                icon: '🏆',
                sort_order: 5,
                items: ['Sports Memorabilia', 'Movie & TV Memorabilia', 'Music Memorabilia', 'Autographs', 'Signed Items'],
            },
            {
                name: 'Coins & Banknotes',
                icon: '🪙',
                sort_order: 6,
                items: ['World Coins', 'UK Coins', 'Banknotes', 'Coin Sets', 'Error Coins'],
            },
            {
                name: 'Stamps',
                icon: '📮',
                sort_order: 7,
                items: ['World Stamps', 'UK Stamps', 'First Day Covers', 'Stamp Albums'],
            },
            {
                name: 'Arts & Crafts',
                icon: '🎨',
                sort_order: 8,
                items: ['Painting Supplies', 'Drawing & Sketching', 'Knitting & Crochet', 'Sewing & Embroidery', 'Scrapbooking', 'Jewellery Making'],
            },
        ],
    },
    {
        name: 'Sports',
        icon: '⚽',
        sort_order: 9,
        subcategories: [
            {
                name: 'Cycling',
                icon: '🚴',
                sort_order: 1,
                items: ['Road Bikes', 'Mountain Bikes', 'BMX', 'Cycling Accessories & Tools', 'Kids\' Bikes', 'Bike Trailers', 'Kids\' Bike Seats', 'Bike Parts'],
            },
            {
                name: 'Fitness, Running & Yoga',
                icon: '🏃',
                sort_order: 2,
                items: ['Running Shoes', 'Gym Equipment', 'Yoga Mats & Accessories', 'Resistance Bands', 'Weights & Dumbbells', 'Fitness Clothing', 'Fitness Trackers'],
            },
            {
                name: 'Outdoor Sports',
                icon: '🏕️',
                sort_order: 3,
                items: ['Camping & Hiking', 'Climbing', 'Fishing', 'Hunting', 'Kayaking & Canoeing', 'Skiing & Snowboarding'],
            },
            {
                name: 'Water Sports',
                icon: '🏊',
                sort_order: 4,
                items: ['Swimming', 'Surfing', 'Diving', 'Sailing', 'Wakeboarding', 'Paddleboarding'],
            },
            {
                name: 'Team Sports',
                icon: '⚽',
                sort_order: 5,
                items: ['Football', 'Basketball', 'Rugby', 'Cricket', 'Baseball', 'Volleyball', 'Hockey'],
            },
            {
                name: 'Racket Sports',
                icon: '🎾',
                sort_order: 6,
                items: ['Tennis', 'Badminton', 'Squash', 'Table Tennis', 'Padel'],
            },
            {
                name: 'Golf',
                icon: '⛳',
                sort_order: 7,
                items: ['Golf Clubs', 'Golf Bags', 'Golf Balls', 'Golf Clothing', 'Golf Accessories'],
            },
            {
                name: 'Equestrian & Horseback Riding',
                icon: '🐴',
                sort_order: 8,
                items: ['Riding Clothing', 'Saddles & Tack', 'Horse Care', 'Riding Boots', 'Helmets'],
            },
            {
                name: 'Skateboards & Scooters',
                icon: '🛹',
                sort_order: 9,
                items: ['Skateboards', 'Longboards', 'Scooters', 'Protective Gear', 'Parts & Accessories'],
            },
            {
                name: 'Boxing & Martial Arts',
                icon: '🥊',
                sort_order: 10,
                items: ['Boxing Gloves', 'Punch Bags', 'MMA Equipment', 'Protective Gear', 'Clothing & Uniforms'],
            },
        ],
    },
];

// ─── Seed Function ─────────────────────────────────────────
const seedCategories = async () => {
    try {
        const isLocal = process.env.NODE_ENV !== 'production';
        const dbUriToUse = isLocal ? (process.env.LOCAL_MONGO_URI || process.env.MONGO_URI) : process.env.MONGO_URI;

        console.log(`\n🔗 CATEGORY SEED: Connecting to ${isLocal ? 'LOCAL' : 'LIVE'} database...`);
        await mongoose.connect(dbUriToUse);
        console.log('✅ Connected successfully.');

        // Clear existing category data
        await ItemType.deleteMany({});
        await Subcategory.deleteMany({});
        await Category.deleteMany({});
        console.log('🗑️  Cleared existing categories, subcategories, sub-subcategories');

        let totalSubcats = 0;
        let totalSubSubcats = 0;

        for (const catData of CATEGORY_TREE) {
            // Create top-level category
            const category = await Category.create({
                name: catData.name,
                slug: slug(catData.name),
                icon: catData.icon,
                sort_order: catData.sort_order,
                is_active: true,
            });
            console.log(`\n📁 Category: ${catData.name}`);

            for (const subData of catData.subcategories) {
                // Create subcategory (left panel)
                const subcategory = await Subcategory.create({
                    category_id: category._id,
                    name: subData.name,
                    slug: slug(subData.name),
                    icon: subData.icon,
                    sort_order: subData.sort_order,
                    is_active: true,
                });
                totalSubcats++;
                console.log(`  📂 Subcategory: ${subData.name}`);

                // Create item types (right panel)
                for (let i = 0; i < subData.items.length; i++) {
                    await ItemType.create({
                        subcategory_id: subcategory._id,
                        category_id: category._id,
                        name: subData.items[i],
                        slug: slug(subData.items[i]),
                        sort_order: i + 1,
                        is_active: true,
                    });
                    totalSubSubcats++;
                }
                console.log(`     ↳ ${subData.items.length} items seeded`);
            }
        }

        console.log('\n─────────────────────────────────────────');
        console.log(`✅ Seeding complete!`);
        console.log(`   Categories:        ${CATEGORY_TREE.length}`);
        console.log(`   Subcategories:     ${totalSubcats}`);
        console.log(`   Sub-subcategories: ${totalSubSubcats}`);
        console.log('─────────────────────────────────────────\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding categories:', error);
        process.exit(1);
    }
};

seedCategories();
