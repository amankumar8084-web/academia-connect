import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    colorIndex: {
        type: Number,
        default: () => Math.floor(Math.random() * 8),
    },
}, { timestamps: true });

// Index for efficient queries
groupSchema.index({ members: 1 });
groupSchema.index({ creator: 1 });

export default mongoose.model('Group', groupSchema);
