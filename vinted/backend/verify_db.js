const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

const sync = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({
            username: String,
            profile_image: String
        }));
        const user = await User.findOne({ username: 'padma_style' });
        if (user) {
            user.profile_image = 'image/profile/profile_image-1771507255114.png';
            await user.save();
            console.log('Force synced padma_style to latest uploaded image');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
sync();
