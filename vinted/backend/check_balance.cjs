const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vinted_updated_sangvish');
    const User = require('./models/User.js').default || require('./models/User.js');
    const users = await User.find({}, { username: 1, email: 1, balance: 1, pending_balance: 1 }).limit(10);
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
