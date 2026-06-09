const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

const userSchema = new mongoose.Schema({
    email: String,
    username: String
}, { collection: 'users' });

const cartSchema = new mongoose.Schema({
    user_id: mongoose.Schema.Types.ObjectId,
    items: [{
        item_id: mongoose.Schema.Types.ObjectId,
        selected: Boolean,
        added_at: Date
    }]
}, { collection: 'carts' });

const itemSchema = new mongoose.Schema({
    title: String,
    price: Number,
    seller_id: mongoose.Schema.Types.ObjectId
}, { collection: 'items' });

const User = mongoose.model('User', userSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Item = mongoose.model('Item', itemSchema);

async function checkCart() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const user = await User.findOne({ email: 'buyer@email.com' });
    if (!user) {
        console.log("Buyer user not found!");
        process.exit(1);
    }
    
    console.log(`Buyer user ID: ${user._id}`);
    
    const cart = await Cart.findOne({ user_id: user._id });
    if (!cart) {
        console.log("No cart found for buyer!");
    } else {
        console.log(`Cart has ${cart.items.length} items:`);
        for (let entry of cart.items) {
            const item = await Item.findById(entry.item_id);
            if (item) {
                console.log(`  - Item ID: ${item._id}, Title: "${item.title}", Price: ${item.price}, Seller ID: ${item.seller_id}, Selected: ${entry.selected}`);
            } else {
                console.log(`  - Unknown Item ID: ${entry.item_id}, Selected: ${entry.selected}`);
            }
        }
    }
    
    // Let's also print 5 items in the database that are from the same seller, so we know what we can add
    const items = await Item.find({}).limit(10);
    console.log("\nSome available items in DB:");
    items.forEach(i => {
        console.log(`  - Item ID: ${i._id}, Title: "${i.title}", Price: ${i.price}, Seller: ${i.seller_id}`);
    });
    
    process.exit(0);
}

checkCart().catch(console.error);
