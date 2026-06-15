import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // Adjust if needed

const uri = process.env.MONGO_URI || 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

import '../models/Item.js';
import '../models/User.js';
import '../models/Currency.js';
import '../models/ShippingCompany.js';
import Order from '../models/Order.js';

async function check() {
    await mongoose.connect(uri);
    
    const User = mongoose.connection.collection('users');
    const user = await User.findOne({ email: 'buyer@email.com' });
    
    if (user) {
        console.log(`Checking populated orders for ${user.email}...`);
        
        try {
            const bought = await Order.find({ buyer_id: user._id })
                .populate('item_id', 'title images currency_id')
                .populate('items.item_id', 'title size images currency_id')
                .populate('seller_id', 'username')
                .populate('currency_id')
                .populate('shipping_company_id')
                .sort({ created_at: -1 })
                .limit(10);
            
            console.log(`Fetched ${bought.length} populated orders.`);
            let nullItems = 0;
            bought.forEach(o => {
                if (!o.item_id) nullItems++;
            });
            console.log(`${nullItems} orders have a null item_id after population.`);
        } catch (err) {
            console.error("Error populating orders:", err);
        }
    }
    
    await mongoose.disconnect();
}

check().catch(console.error);
