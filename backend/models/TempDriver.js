const mongoose = require('mongoose');

const tempDriverSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: 4
  },
  isLogin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // TTL index - document expires after 5 minutes (300 seconds)
  }
});

// Index for faster queries
tempDriverSchema.index({ email: 1 });
tempDriverSchema.index({ otp: 1 });
tempDriverSchema.index({ email: 1, isLogin: 1 });

module.exports = mongoose.model('TempDriver', tempDriverSchema);
