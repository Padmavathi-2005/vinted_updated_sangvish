const mongoose = require('mongoose');
const User = require('g:/vinted-updated/vinted/backend/models/User.js').default;
const dotenv = require('dotenv');
dotenv.config({ path: 'g:/vinted-updated/vinted/backend/.env' });

async function checkAdmin() {
    await mongoose.connect(process.env.MONGO_URI);
    
    let admin = await User.findOne({ role: 'admin' });
    if(admin) console.log("Admin email:", admin.email);
    else console.log("No admin found.");
    
    process.exit(0);
}

checkAdmin().catch(console.error);
