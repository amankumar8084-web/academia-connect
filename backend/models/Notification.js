import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['post_created', 'user_created'],
        required: true,
    },
    message: { type: String, required: true },
    actorName: { type: String },
    actorRole: { type: String },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// TTL index to automatically delete documents 7 days (604800 seconds) after creation 
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.model('Notification', notificationSchema);
