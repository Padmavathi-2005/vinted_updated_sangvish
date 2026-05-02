import mongoose from 'mongoose';

const adminPermissionSchema = mongoose.Schema(
    {
        admin_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true,
        },
        permission_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Permission',
            required: true,
        },
        granted_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
    }
);

export default mongoose.model('AdminPermission', adminPermissionSchema);
