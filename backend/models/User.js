import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['super-admin', 'admin', 'student'],
    required: true,
  },
  // Profile Data
  name: { type: String }, // For admin
  department: { type: String }, // For admin and student
  phone: { type: String }, // For admin and student
  year: { type: String }, // For student
  regNo: { type: String }, // For student
  domain: { type: String }, // For student
  address: { type: String },
  profilePicture: { type: String }, // Cloudinary URL
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Track who created this user
}, { timestamps: true });

export default mongoose.model('User', userSchema);
