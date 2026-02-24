const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude] - IMPORTANT: longitude FIRST, latitude SECOND
      required: [true, 'Pickup coordinates are required']
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
      type: [Number], // [longitude, latitude] - IMPORTANT: longitude FIRST, latitude SECOND
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
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger is required']
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index for location queries
tripSchema.index({ pickupLocation: '2dsphere' });
tripSchema.index({ destination: '2dsphere' });

/**
 * Example proximity search queries:
 * 
 * Find trips within 5km of a location:
 * 
 * const nearbyTrips = await Trip.find({
 *   pickupLocation: {
 *     $near: {
 *       $geometry: {
 *         type: 'Point',
 *         coordinates: [longitude, latitude]
 *       },
 *       $maxDistance: 5000 // in meters
 *     }
 *   }
 * });
 *
 * Or using aggregation:
 * 
 * const nearbyTrips = await Trip.aggregate([
 *   {
 *     $geoNear: {
 *       near: {
 *         type: 'Point',
 *         coordinates: [longitude, latitude]
 *       },
 *       distanceField: 'distance',
 *       maxDistance: 5000,
 *       spherical: true
 *     }
 *   }
 * ]);
 */

module.exports = mongoose.model('Trip', tripSchema);
