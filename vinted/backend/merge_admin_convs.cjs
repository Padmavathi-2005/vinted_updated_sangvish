const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted').then(async () => {
    const db = mongoose.connection.db;
    const conversations = await db.collection('conversations').find().toArray();
    
    const pairs = {};
    for (let conv of conversations) {
        if (!conv.participants || conv.participants.length < 2) continue;
        
        let p1 = conv.participants[0];
        let p2 = conv.participants[1];
        
        let hasAdmin = p1.on_model === 'Admin' || p2.on_model === 'Admin';
        let hasUser = p1.on_model === 'User' || p2.on_model === 'User';
        
        if (hasAdmin && hasUser) {
            let userId = p1.on_model === 'User' ? (p1.user ? p1.user.toString() : 'null') : (p2.user ? p2.user.toString() : 'null');
            let key = userId + '_ADMIN';
            
            if (!pairs[key]) pairs[key] = [];
            pairs[key].push(conv);
        }
    }
    
    for (let key in pairs) {
        let convs = pairs[key];
        if (convs.length > 1) {
            convs.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            
            let primary = convs[0];
            let duplicates = convs.slice(1);
            
            console.log('Merging', duplicates.length, 'ADMIN duplicates into primary', primary._id, 'for user', key);
            
            for (let dup of duplicates) {
                await db.collection('messages').updateMany(
                    { conversation_id: dup._id },
                    { $set: { conversation_id: primary._id } }
                );
                await db.collection('conversations').deleteOne({ _id: dup._id });
            }
        }
    }
    console.log('Admin Merge complete!');
    process.exit(0);
});
