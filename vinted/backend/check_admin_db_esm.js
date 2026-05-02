import mongoose from 'mongoose';

const mongoURI = 'mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted';

async function checkCounts() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to Admin Database');
    
    // Check reports
    try {
        const reportCount = await mongoose.connection.db.collection('reports').countDocuments();
        console.log('Reports count:', reportCount);
    } catch(e) {
        console.log('Reports collection not found or error:', e.message);
    }

    // Check items
    try {
        const itemCount = await mongoose.connection.db.collection('items').countDocuments();
        console.log('Items count:', itemCount);
    } catch(e) {
        console.log('Items collection not found');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkCounts();
