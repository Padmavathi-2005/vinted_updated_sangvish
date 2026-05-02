import mongoose from 'mongoose';

const permissionSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a permission name'],
            unique: true,
        },
        description: {
            type: String,
        },
        module: {
            type: String,
            required: [true, 'Please add a module name'],
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

export default mongoose.model('Permission', permissionSchema);
