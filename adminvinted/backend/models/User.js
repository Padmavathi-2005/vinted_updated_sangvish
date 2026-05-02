import mongoose from 'mongoose';

import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Please add a username'],
            unique: true,
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
        },
        password_hash: {
            type: String,
            required: [true, 'Please add a password'],
        },
        phone: {
            type: String,
        },

        profile_image: {
            type: String,
            default: '',
        },
        bio: {
            type: String,
            default: '',
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer not to say'],
        },
        rating_avg: {
            type: Number,
            default: 0,
        },
        rating_count: {
            type: Number,
            default: 0,
        },
        followers_count: {
            type: Number,
            default: 0,
        },
        following_count: {
            type: Number,
            default: 0,
        },
        is_verified: {
            type: Boolean,
            default: false,
        },
        is_blocked: {
            type: Boolean,
            default: false,
        },
        last_login: {
            type: Date,
        },
        address: {
            full_name: String,
            address_line: String,
            city: String,
            state: String,
            country: String,
            pincode: String,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
        balance: {
            type: Number,
            default: 0.00,
        },
        wallet_currency: {
            type: String,
            default: 'EUR',
        },
        cookie_consent: {
            type: Boolean,
            default: false,
        },
        bundle_discounts: {
            enabled: { type: Boolean, default: false },
            two_items: { type: Number, default: 0 }, // percentage
            three_items: { type: Number, default: 0 },
            five_items: { type: Number, default: 0 },
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
        toJSON: {
            transform: function (doc, ret) {
                if (ret.profile_image && !ret.profile_image.startsWith('http')) {
                    // Remove leading slashes and old prefixes
                    let cleanPath = ret.profile_image.replace(/^\/+/, '');
                    cleanPath = cleanPath.replace(/^image\/profile\//, '');
                    cleanPath = cleanPath.replace(/^images\/profile\//, '');

                    ret.profile_image = `images/profile/${cleanPath}`;
                }
                return ret;
            }
        },
        toObject: {
            transform: function (doc, ret) {
                if (ret.profile_image && !ret.profile_image.startsWith('http')) {
                    let cleanPath = ret.profile_image.replace(/^\/+/, '');
                    cleanPath = cleanPath.replace(/^image\/profile\//, '');
                    cleanPath = cleanPath.replace(/^images\/profile\//, '');

                    ret.profile_image = `images/profile/${cleanPath}`;
                }
                return ret;
            }
        }
    }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password_hash')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password_hash);
};

export default mongoose.model('User', userSchema);
