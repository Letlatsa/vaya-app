const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  // ===== PARTIES =====
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger is required'],
    index: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // ===== LOCATION DATA =====
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Pickup coordinates are required'],
      index: '2dsphere'
    },
    address: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  destination: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Destination coordinates are required']
    },
    address: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },

  // ===== ROUTE TRACKING =====
  route: {
    distance: Number,
    duration: Number,
    polyline: String, // Encoded polyline
    waypoints: [
      {
        lat: Number,
        lng: Number,
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },

  // ===== TRIP STATUS STATE MACHINE =====
  status: {
    type: String,
    enum: ['pending', 'active', 'arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  statusHistory: [
    {
      status: String,
      changedAt: { type: Date, default: Date.now },
      changedBy: mongoose.Schema.Types.ObjectId
    }
  ],

  // ===== RIDE DETAILS =====
  rideType: {
    type: String,
    enum: ['Standard', 'Comfort', 'XL'],
    default: 'Standard'
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'WALLET'],
    default: 'CASH'
  },

  // ===== TIMING =====
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  acceptedAt: Date,
  arrivedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,

  // ===== DISTANCES & DURATION =====
  estimatedDistance: Number,
  estimatedDuration: Number, // in seconds
  actualDistance: Number,
  actualDuration: Number, // in minutes

  // ===== BILLING =====
  billing: {
    baseFare: { type: Number, default: 5.00 },
    distanceCharge: Number,
    timeCharge: Number,
    subtotal: Number,
    tax: Number,
    totalCost: Number,
    currency: { type: String, default: 'ZWL' },
    surgePricing: {
      enabled: { type: Boolean, default: false },
      multiplier: { type: Number, default: 1.0 },
      reason: String
    }
  },

  // ===== PAYMENT =====
  payment: {
    method: {
      type: String,
      enum: ['CASH', 'CARD', 'WALLET'],
      default: 'CASH'
    },
    status: {
      type: String,
      enum: ['unpaid', 'pending', 'completed', 'failed', 'refunded'],
      default: 'unpaid'
    },
    transactionId: String,
    paymentGateway: String,
    processedAt: Date,
    receiptUrl: String,
    refundDetails: {
      refundId: String,
      amount: Number,
      reason: String,
      refundedAt: Date
    }
  },

  // ===== RATINGS =====
  ratings: {
    clientRating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    },
    driverRating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    }
  },

  // ===== CANCELLATION =====
  cancellation: {
    cancelled: { type: Boolean, default: false },
    cancelledBy: {
      type: String,
      enum: ['CLIENT', 'DRIVER', 'SYSTEM']
    },
    reason: String,
    refundAmount: Number,
    cancelledAt: Date
  },

  // ===== ADDITIONAL DATA =====
  notes: String,
  specialRequests: String,
  emergencyContactNotified: { type: Boolean, default: false },

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
tripSchema.index({ createdAt: -1 });
tripSchema.index({ startedAt: 1, completedAt: 1 });
tripSchema.index({ 'destination.coordinates': '2dsphere' });

module.exports = mongoose.model('Trip', tripSchema);
