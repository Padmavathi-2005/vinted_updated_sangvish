import mongoose from 'mongoose';

const adminSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
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
        role: {
            type: String,
            default: 'admin',
        },
        profile_image: {
            type: String,
            default: '',
        },
        is_active: {
            type: Boolean,
            default: true,
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

export default mongoose.model('Admin', adminSchema);
