import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const testConn = async () => {
  try {
    console.log('Testing connection to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log('✅ Success! MongoDB is reachable.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
};

testConn();
