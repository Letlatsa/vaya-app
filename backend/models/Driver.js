const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  profilePicture: {
    type: String,
    default: null
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    trim: true
  },
  licenseFront: {
    type: String,
    default: null
  },
  licenseBack: {
    type: String,
    default: null
  },
  carMake: {
    type: String,
    required: [true, 'Car make is required'],
    trim: true
  },
  carModel: {
    type: String,
    required: [true, 'Car model is required'],
    trim: true
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    trim: true,
    uppercase: true
  },
  carColor: {
    type: String,
    required: [true, 'Car color is required'],
    trim: true
  },
  passengerCount: {
    type: Number,
    required: [true, 'Passenger count is required'],
    min: [1, 'At least 1 passenger'],
    max: [10, 'Maximum 10 passengers']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalTrips: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

driverSchema.index({ email: 1 });
driverSchema.index({ licenseNumber: 1 });
driverSchema.index({ registrationNumber: 1 });

module.exports = mongoose.model('Driver', driverSchema);