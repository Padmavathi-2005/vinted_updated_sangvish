import mongoose from 'mongoose';

const mongoURI = 'mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted';

async function checkCounts() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to User Database');
    
    // Check users
    try {
        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log('Users count:', userCount);
    } catch(e) {
        console.log('Users collection not found');
    }

    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}

checkCounts();
