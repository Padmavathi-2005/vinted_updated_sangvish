const mongoose = require('mongoose');
const uri = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';
mongoose.connect(uri).then(async () => {
    const db = mongoose.connection.db;
    const msgs = await db.collection('messages').find({ message_type: 'image' }).sort({created_at: -1}).limit(2).toArray();
    console.log("BY TYPE:", msgs.map(m => m.message));
    
    const msgs2 = await db.collection('messages').find({ message: /image/i }).sort({created_at: -1}).limit(2).toArray();
    console.log("BY REGEX:", msgs2.map(m => m.message));
    process.exit(0);
}).catch(e => console.error(e));
