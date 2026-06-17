const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/.env' });

mongoose.connect(process.env.MONGO_URI || process.env.LOCAL_MONGO_URI).then(async () => {
  console.log('Connected to DB');
  
  const UserSchema = new mongoose.Schema({ email: String, balance: Number, pending_balance: Number }, { strict: false });
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  
  const WalletSchema = new mongoose.Schema({ owner_id: mongoose.Schema.Types.ObjectId, owner_type: String, balance: Number, pending_balance: Number }, { strict: false });
  const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
  
  const users = await User.find({});
  let synced = 0;
  for (const user of users) {
    const wallet = await Wallet.findOne({ owner_id: user._id, owner_type: 'User' });
    if (wallet) {
      if (user.balance !== wallet.balance) {
        console.log(`Syncing balance for user ${user.email}: ${user.balance} -> ${wallet.balance}`);
        await User.updateOne({ _id: user._id }, { $set: { balance: wallet.balance } });
        synced++;
      }
    }
  }
  
  console.log(`Successfully synced ${synced} user balances.`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
