const mongoose = require('mongoose');

const tempUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    unique: true
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: 4
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // TTL index - document expires after 5 minutes (300 seconds)
  }
});

// Index for faster queries
tempUserSchema.index({ email: 1 });
tempUserSchema.index({ otp: 1 });

module.exports = mongoose.model('TempUser', tempUserSchema);
