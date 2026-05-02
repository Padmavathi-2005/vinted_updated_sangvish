import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Windows local DNS refusing MongoDB SRV lookups
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore
}

const connectDB = async (retryCount = 5) => {
  let attempt = 1;
  while (attempt <= retryCount) {
    try {
      console.log(`Connecting to MongoDB (Attempt ${attempt}/${retryCount})...`);

      const dbUriToUse = process.env.MONGO_URI || process.env.LOCAL_MONGO_URI;

      if (!dbUriToUse) {
        console.error('❌ FATAL: No MongoDB URI found in environment variables');
        throw new Error('MongoDB URI missing');
      }

      console.log(`Targeting Database Host: ${dbUriToUse.split('@')[1]?.split('/')[0] || 'hidden'}`);

      const conn = await mongoose.connect(dbUriToUse, {
        serverSelectionTimeoutMS: 15000, // Increased from 5s to 15s
        family: 4,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });

      if (!conn || !conn.connection) {
        throw new Error('Connection successful but connection object is undefined');
      }

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

      // Listen for errors AFTER connection
      mongoose.connection.on('error', err => {
        console.error('Mongoose connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('Mongoose disconnected');
      });

      return; // Success!
    } catch (error) {
      console.error(`MongoDB Connection Error (Attempt ${attempt}): ${error.message}`);
      if (attempt === retryCount) {
        throw error;
      }
      attempt++;
      console.log('Retrying in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

export default connectDB;

