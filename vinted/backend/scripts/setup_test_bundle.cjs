const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const userSchema = new mongoose.Schema({
    email: String,
    username: String,
    bundle_discounts: {
        enabled: Boolean,
        two_items: Number,
        three_items: Number,
        five_items: Number
    }
}, { collection: 'users' });

const cartSchema = new mongoose.Schema({
    user_id: mongoose.Schema.Types.ObjectId,
    items: [{
        item_id: mongoose.Schema.Types.ObjectId,
        selected: Boolean,
        added_at: Date
    }]
}, { collection: 'carts' });

const User = mongoose.model('User', userSchema);
const Cart = mongoose.model('Cart', cartSchema);

async function setupBundle() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // 1. Configure seller bundle discounts
    const sellerId = '65d1a101a1b2345678900001';
    const seller = await User.findById(sellerId);
    if (!seller) {
        console.log(`Seller ${sellerId} not found in DB!`);
    } else {
        seller.bundle_discounts = {
            enabled: true,
            two_items: 10,
            three_items: 15,
            five_items: 20
        };
        await seller.save();
        console.log(`Configured bundle discounts for seller ${seller.email}`);
    }
    
    // 2. Setup cart for buyer
    const buyerId = '6996e50e35a68d34843dfb6e';
    let cart = await Cart.findOne({ user_id: buyerId });
    if (!cart) {
        cart = new Cart({ user_id: buyerId, items: [] });
    }
    
    // Items to add:
    // Classic Winter Jacket (69b3fd2b7fbb8cd4ce4ca3cc)
    // Miniature Collectible Figure (69b3fd2a7fbb8cd4ce4ca3c1)
    cart.items = [
        { item_id: new mongoose.Types.ObjectId('69b3fd2b7fbb8cd4ce4ca3cc'), selected: true, added_at: new Date() },
        { item_id: new mongoose.Types.ObjectId('69b3fd2a7fbb8cd4ce4ca3c1'), selected: true, added_at: new Date() }
    ];
    
    await cart.save();
    console.log(`Setup buyer's cart with 2 items from seller.`);
    
    process.exit(0);
}

setupBundle().catch(console.error);
