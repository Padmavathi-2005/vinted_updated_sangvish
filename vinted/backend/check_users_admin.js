import mongoose from 'mongoose';

const mongoURI = 'mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted';

async function checkCounts() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to Admin Database');
    
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
