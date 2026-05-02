import mongoose from 'mongoose';

const supportUri = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';
const abinayashriUri = 'mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted';

const compareDBs = async () => {
    try {
        console.log('--- Support DB Stats ---');
        const supportConn = await mongoose.createConnection(supportUri).asPromise();
        const supportUsers = await supportConn.db.collection('users').countDocuments();
        const supportItems = await supportConn.db.collection('items').countDocuments();
        const supportCats = await supportConn.db.collection('categories').countDocuments();
        console.log('Users:', supportUsers);
        console.log('Items:', supportItems);
        console.log('Categories:', supportCats);
        await supportConn.close();

        console.log('\n--- Abinayashri DB Stats ---');
        const abinayashriConn = await mongoose.createConnection(abinayashriUri).asPromise();
        const abinayashriUsers = await abinayashriConn.db.collection('users').countDocuments();
        const abinayashriItems = await abinayashriConn.db.collection('items').countDocuments();
        const abinayashriCats = await abinayashriConn.db.collection('categories').countDocuments();
        console.log('Users:', abinayashriUsers);
        console.log('Items:', abinayashriItems);
        console.log('Categories:', abinayashriCats);
        await abinayashriConn.close();

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

compareDBs();
