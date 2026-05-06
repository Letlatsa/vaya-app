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
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    index: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
    index: true
  },
  profilePicture: {
    type: String,
    default: null
  },

  // ===== LICENSE INFORMATION =====
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    trim: true,
    unique: true,
    index: true
  },
  licenseFront: {
    type: String,
    default: null
  },
  licenseBack: {
    type: String,
    default: null
  },
  licenseExpiryDate: Date,

  // ===== VEHICLE INFORMATION =====
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
    uppercase: true,
    unique: true,
    index: true
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
  vehicleImageUrls: [String],
  insuranceExpiryDate: Date,
  inspectionExpiryDate: Date,

  // ===== STATUS & AVAILABILITY =====
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'ONLINE', 'OFFLINE', 'ON_TRIP'],
    default: 'pending',
    index: true
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  lastStatusUpdate: {
    type: Date,
    default: Date.now
  },

  // ===== CURRENT LOCATION =====
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    accuracy: Number,
    updatedAt: Date
  },

  // ===== PERFORMANCE METRICS =====
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalTrips: {
    type: Number,
    default: 0,
    index: true
  },
  completedTrips: {
    type: Number,
    default: 0
  },
  cancelledTrips: {
    type: Number,
    default: 0
  },
  acceptanceRate: {
    type: Number,
    default: 100
  },
  cancellationRate: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },

  // ===== RATINGS & REVIEWS =====
  ratings: [
    {
      tripId: mongoose.Schema.Types.ObjectId,
      clientId: mongoose.Schema.Types.ObjectId,
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],

  // ===== VERIFICATION =====
  backgroundCheckStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  backgroundCheckDate: Date,
  documentVerified: {
    type: Boolean,
    default: false
  },

  // ===== PREFERENCES =====
  preferredAreas: [String],
  acceptSharedRides: {
    type: Boolean,
    default: false
  },
  acceptSmartRouting: {
    type: Boolean,
    default: true
  },

  // ===== METADATA =====
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound and special indexes that need specific configuration
driverSchema.index({ totalTrips: -1 });
driverSchema.index({ rating: -1 });

module.exports = mongoose.model('Driver', driverSchema);