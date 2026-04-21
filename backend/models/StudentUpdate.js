import mongoose from 'mongoose';

const studentUpdateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // Storing as YYYY-MM-DD for easier daily grouping
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Ensure unique entry per student per day per type (removed to allow multiple entries)
// studentUpdateSchema.index({ student: 1, date: 1, type: 1 }, { unique: true });

// Compound index for admin analytics aggregation
studentUpdateSchema.index({ student: 1, date: -1 });

export default mongoose.model('StudentUpdate', studentUpdateSchema);
