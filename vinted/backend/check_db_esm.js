import mongoose from 'mongoose';

const mongoURI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

async function checkCounts() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to User Database');
    
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
