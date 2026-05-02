import Category from './models/Category.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const checkCategories = async () => {
    await connectDB();
    const cats = await Category.find({}).limit(5);
    console.log("Categories:", JSON.stringify(cats.map(c => ({ name: c.name, image: c.image })), null, 2));
    process.exit();
};

checkCategories();
