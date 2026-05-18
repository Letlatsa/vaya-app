const express = require('express');
const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const tripService = require('../services/tripService');
const paymentService = require('../services/paymentService');
const ratingService = require('../services/ratingService');
const {
  calculateDistance,
  calculateTravelTime,
  calculateFare,
  getAddressFromCoords,
  getCoordsFromAddress,
  getRouteDetails,
  calculateBilling,
  calculateDistanceFromWaypoints
} = require('../services/tripService');

module.exports = (socketManager) => {
  const router = express.Router();

// @route  POST /api/trips/geocode
// @desc   Convert address to coordinates
// @access Public
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }

    const result = await getCoordsFromAddress(address);

    res.status(200).json({
      success: true,
      data: {
        coordinates: { lat: result.lat, lng: result.lng },
        address: result.address
      }
    });
  } catch (error) {
    console.error('Geocode Error:', error);
    res.status(500).json({ success: false, message: 'Failed to geocode address' });
  }
});

// @route  POST /api/trips/reverse-geocode
// @desc   Convert coordinates to address
// @access Public
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const address = await getAddressFromCoords(lat, lng);

    res.status(200).json({
      success: true,
      data: { address }
    });
  } catch (error) {
    console.error('Reverse Geocode Error:', error);
    res.status(500).json({ success: false, message: 'Failed to reverse geocode coordinates' });
  }
});

// @route  POST /api/trips/estimate
// @desc   Calculate distance, time, and fare for a trip
// @access Public
router.post('/estimate', async (req, res) => {
  try {
    const { pickupCoords, destinationCoords } = req.body;

    if (!pickupCoords || !destinationCoords) {
      return res.status(400).json({ success: false, message: 'Pickup and destination coordinates are required' });
    }

    // Calculate route details (distance, time, fare)
    const routeDetails = await getRouteDetails(
      pickupCoords.lat,
      pickupCoords.lng,
      destinationCoords.lat,
      destinationCoords.lng
    );

    // Get addresses for the coordinates
    const [pickupAddress, destinationAddress] = await Promise.all([
      getAddressFromCoords(pickupCoords.lat, pickupCoords.lng),
      getAddressFromCoords(destinationCoords.lat, destinationCoords.lng)
    ]);

    res.status(200).json({
      success: true,
      data: {
        pickup: {
          coordinates: pickupCoords,
          address: pickupAddress
        },
        destination: {
          coordinates: destinationCoords,
          address: destinationAddress
        },
        distance: routeDetails.distance,
        duration: routeDetails.duration,
        fare: routeDetails.fare,
        route: routeDetails.route,
        pricing: {
          baseFare: 50,
          perKmRate: 10,
          calculation: routeDetails.distance.value <= 5.0 ?
            `Base fare: M50 (distance ≤ 5km)` :
            `Base fare: M50 + M10 × ${routeDetails.distance.value.toFixed(1)}km = M${routeDetails.fare.toFixed(2)}`
        }
      }
    });
  } catch (error) {
    console.error('Estimate Error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate trip estimate' });
  }
});

// @route  POST /api/trips/route
// @desc   Get route between two points
// @access Public
router.post('/route', async (req, res) => {
  try {
    const { originCoords, destinationCoords } = req.body;

    if (!originCoords || !destinationCoords) {
      return res.status(400).json({ success: false, message: 'Origin and destination coordinates are required' });
    }

    const routeDetails = await getRouteDetails(
      originCoords.lat,
      originCoords.lng,
      destinationCoords.lat,
      destinationCoords.lng
    );

    res.status(200).json({
      success: true,
      data: {
        distance: routeDetails.distance,
        duration: routeDetails.duration,
        polyline: routeDetails.route.polyline,
        waypoints: routeDetails.route.waypoints
      }
    });
  } catch (error) {
    console.error('Route Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get route' });
  }
});

// @route  POST /api/trips
// @desc   Rider creates a new trip (places booking)
// @access Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { pickupCoords, pickupLabel, destinationCoords, destinationLabel, rideType } = req.body;

    if (!pickupCoords || !destinationCoords) {
      return res.status(400).json({ success: false, message: 'Pickup and destination coordinates are required' });
    }

    // Calculate route details and fare
    const routeDetails = await getRouteDetails(
      pickupCoords.lat,
      pickupCoords.lng,
      destinationCoords.lat,
      destinationCoords.lng
    );

    // Get addresses if not provided
    let finalPickupLabel = pickupLabel;
    let finalDestinationLabel = destinationLabel;

    if (!finalPickupLabel) {
      finalPickupLabel = await getAddressFromCoords(pickupCoords.lat, pickupCoords.lng);
    }

    if (!finalDestinationLabel) {
      finalDestinationLabel = await getAddressFromCoords(destinationCoords.lat, destinationCoords.lng);
    }

    const trip = new Trip({
      pickupLocation: {
        type: 'Point',
        coordinates: [pickupCoords.lng, pickupCoords.lat], // Note: MongoDB GeoJSON uses [lng, lat]
        address: finalPickupLabel,
      },
      destination: {
        type: 'Point',
        coordinates: [destinationCoords.lng, destinationCoords.lat], // Note: MongoDB GeoJSON uses [lng, lat]
        address: finalDestinationLabel,
      },
      price: routeDetails.fare,
      rideType: rideType || 'Standard',
      passenger: req.user.id,
      status: 'pending',
    });

    await trip.save();
    await trip.populate('passenger', 'name phoneNumber profilePicture');

    console.log(`🚖 New trip booked by ${req.user.id} — Trip ID: ${trip._id} — Fare: M${routeDetails.fare.toFixed(2)}`);

    res.status(201).json({
      success: true,
      message: 'Trip booked successfully',
      data: {
        ...trip.toObject(),
        distance: routeDetails.distance,
        duration: routeDetails.duration,
        pricing: {
          baseFare: 50,
          perKmRate: 10,
          calculation: routeDetails.distance.value <= 5.0 ?
            `Base fare: M50 (distance ≤ 5km)` :
            `Base fare: M50 + M10 × ${routeDetails.distance.value.toFixed(1)}km = M${routeDetails.fare.toFixed(2)}`
        }
      }
    });
  } catch (error) {
    console.error('Create Trip Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  GET /api/trips/my-rides
// @desc   Rider fetches their own trip history
// @access Private
router.get('/my-rides', authMiddleware, async (req, res) => {
  try {
    const trips = await Trip.find({ passenger: req.user.id })
      .populate('driver', 'name phoneNumber profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    console.error('My Rides Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  GET /api/trips/pending
// @desc   Drivers fetch all pending trips
// @access Private
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'pending' })
      .populate('passenger', 'name phoneNumber profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    console.error('Get Pending Trips Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  PATCH /api/trips/:id/accept
// @desc   Driver accepts a trip
// @access Private
router.patch('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status !== 'pending') return res.status(400).json({ success: false, message: 'Trip is no longer available' });

    trip.driver = req.user.id;
    trip.status = 'active';
    trip.startedAt = new Date();
    await trip.save();
    await trip.populate('passenger', 'name phoneNumber profilePicture');
    await trip.populate('driver', 'fullName phoneNumber profilePicture carModel registrationNumber rating currentLocation');

    console.log(`✅ Trip ${trip._id} accepted by driver ${req.user.id}`);

    // Notify passenger via socket
    socketManager.notifyClient(trip.passenger._id, 'ride:request:accepted', {
      tripId: trip._id,
      driver: {
        id: trip.driver._id,
        name: trip.driver.fullName,
        phoneNumber: trip.driver.phoneNumber,
        profilePicture: trip.driver.profilePicture,
        carModel: trip.driver.carModel,
        registrationNumber: trip.driver.registrationNumber,
        rating: trip.driver.rating,
        currentLocation: trip.driver.currentLocation
      },
      acceptedAt: trip.startedAt
    });

    res.status(200).json({ success: true, message: 'Trip accepted', data: trip });
  } catch (error) {
    console.error('Accept Trip Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  GET /api/trips/:id/status
// @desc   Rider polls trip status
// @access Private
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('driver', 'fullName phoneNumber profilePicture carModel registrationNumber rating currentLocation');

    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    res.status(200).json({ success: true, data: { status: trip.status, driver: trip.driver } });
  } catch (error) {
    console.error('Trip Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================
// ===== NEW ENDPOINTS =====
// ============================

// @route  PUT /api/trips/:id/arrived
// @desc   Driver marks arrival at pickup location
// @access Private
router.put('/:id/arrived', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'arrived',
          arrivedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'arrived',
            changedAt: new Date(),
            changedBy: req.user.id
          }
        }
      },
      { new: true }
    ).populate('passenger driver');

    res.status(200).json({
      success: true,
      message: 'Driver marked as arrived',
      data: trip
    });
  } catch (error) {
    console.error('Arrived Error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark arrival' });
  }
});

// @route  PUT /api/trips/:id/start
// @desc   Driver starts the trip (client boarded)
// @access Private
router.put('/:id/start', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'in_progress',
          startedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'in_progress',
            changedAt: new Date(),
            changedBy: req.user.id
          }
        }
      },
      { new: true }
    ).populate('passenger driver');

    res.status(200).json({
      success: true,
      message: 'Trip started',
      data: trip
    });
  } catch (error) {
    console.error('Start Trip Error:', error);
    res.status(500).json({ success: false, message: 'Failed to start trip' });
  }
});

// @route  PUT /api/trips/:id/complete
// @desc   Driver completes trip and triggers billing
// @access Private
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { actualDistance, actualDuration, waypoints } = req.body;

    if (!actualDistance || !actualDuration) {
      return res.status(400).json({
        success: false,
        message: 'actualDistance and actualDuration are required'
      });
    }

    // Calculate billing
    const billing = calculateBilling(actualDistance, actualDuration);

    // If waypoints provided, recalculate distance more accurately
    let finalDistance = actualDistance;
    if (waypoints && waypoints.length > 0) {
      finalDistance = calculateDistanceFromWaypoints(waypoints);
      // Recalculate billing with actual distance
      const revisedBilling = calculateBilling(finalDistance, actualDuration);
      const updatedTrip = await Trip.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            actualDistance: finalDistance,
            actualDuration,
            billing: revisedBilling,
            'payment.status': 'unpaid',
            'route.waypoints': waypoints
          },
          $push: {
            statusHistory: {
              status: 'completed',
              changedAt: new Date(),
              changedBy: req.user.id
            }
          }
        },
        { new: true }
      ).populate('passenger driver');

      // Update driver stats
      await Driver.findByIdAndUpdate(req.user.id, {
        $inc: {
          completedTrips: 1,
          totalEarnings: revisedBilling.totalCost
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Trip completed',
        data: {
          trip: updatedTrip,
          billing: revisedBilling
        }
      });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          actualDistance,
          actualDuration,
          billing,
          'payment.status': 'unpaid'
        },
        $push: {
          statusHistory: {
            status: 'completed',
            changedAt: new Date(),
            changedBy: req.user.id
          }
        }
      },
      { new: true }
    ).populate('passenger driver');

    // Update driver stats
    await Driver.findByIdAndUpdate(req.user.id, {
      $inc: {
        completedTrips: 1,
        totalEarnings: billing.totalCost
      }
    });

    res.status(200).json({
      success: true,
      message: 'Trip completed',
      data: {
        trip: updatedTrip,
        billing
      }
    });
  } catch (error) {
    console.error('Complete Trip Error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete trip' });
  }
});

// @route  POST /api/trips/:id/payment
// @desc   Process payment for completed trip
// @access Private
router.post('/:id/payment', authMiddleware, async (req, res) => {
  try {
    const { method, cardToken } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Trip must be completed before payment'
      });
    }

    let paymentResult;

    if (method === 'CARD' && cardToken) {
      // Process Stripe payment
      paymentResult = await paymentService.processCardPayment(
        trip._id,
        trip.billing.totalCost,
        cardToken,
        trip.passenger,
        trip.driver
      );
    } else if (method === 'CASH') {
      // Cash payment handled by driver confirmation
      paymentResult = {
        success: true,
        transactionId: `CASH_${Date.now()}`,
        status: 'COMPLETED',
        amount: trip.billing.totalCost,
        timestamp: new Date()
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    if (paymentResult.success) {
      // Update trip payment status
      const updatedTrip = await Trip.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            'payment.status': 'completed',
            'payment.method': method,
            'payment.transactionId': paymentResult.transactionId,
            'payment.processedAt': new Date()
          }
        },
        { new: true }
      ).populate('passenger driver');

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          trip: updatedTrip,
          transactionId: paymentResult.transactionId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment processing failed',
        error: paymentResult.error
      });
    }
  } catch (error) {
    console.error('Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  }
});

// @route  POST /api/trips/:id/rating
// @desc   Submit rating for trip
// @access Private
router.post('/:id/rating', authMiddleware, async (req, res) => {
  try {
    const { score, feedback, tags } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Determine who is rating whom
    let ratedUserId;
    if (trip.passenger.toString() === req.user.id) {
      // Client is rating driver
      ratedUserId = trip.driver;
    } else if (trip.driver.toString() === req.user.id) {
      // Driver is rating client
      ratedUserId = trip.passenger;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this trip'
      });
    }

    const ratingResult = await ratingService.submitRating(
      trip._id,
      ratedUserId,
      req.user.id,
      score,
      feedback,
      tags
    );

    res.status(200).json({
      success: true,
      message: 'Rating submitted',
      data: ratingResult
    });
  } catch (error) {
    console.error('Rating Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

// @route  GET /api/trips/:id/ratings
// @desc   Get user's ratings
// @access Private
router.get('/:id/ratings', authMiddleware, async (req, res) => {
  try {
    const ratings = await ratingService.getUserRatings(req.user.id, 10, 0);

    res.status(200).json({
      success: true,
      data: ratings
    });
  } catch (error) {
    console.error('Get Ratings Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ratings' });
  }
});

// @route  GET /api/trips/:id
// @desc   Get trip details
// @access Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('passenger', 'fullName phoneNumber profilePicture')
      .populate('driver', 'fullName phoneNumber profilePicture carMake carModel carColor registrationNumber');

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Get Trip Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trip' });
  }
});

// @route  PUT /api/trips/:id/location
// @desc   Update driver location during trip
// @access Private
router.put('/:id/location', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, bearing, speed, accuracy } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required'
      });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Add waypoint to trip
    const waypoint = {
      lat,
      lng,
      timestamp: new Date()
    };

    // Update trip route
    if (!trip.route) {
      trip.route = { waypoints: [] };
    }

    trip.route.waypoints.push(waypoint);
    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Location updated'
    });
  } catch (error) {
    console.error('Location Update Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
});

// @route  GET /api/trips/driver/:driverId
// @desc   Get driver's trip history
// @access Private
router.get('/driver/:driverId', authMiddleware, async (req, res) => {
  try {
    const trips = await Trip.find({ driver: req.params.driverId })
      .populate('passenger', 'fullName profilePicture phoneNumber')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    console.error('Driver Trips Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch driver trips' });
  }
});

// @route  PATCH /api/trips/:id/cancel
// @desc   Cancel a trip (only if pending or active)
// @access Private
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Check if trip can be cancelled
    if (!['pending', 'active', 'arrived'].includes(trip.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel trip with status: ${trip.status}`
      });
    }

    // Check authorization (passenger or driver can cancel)
    if (trip.passenger.toString() !== req.user.id && trip.driver?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this trip'
      });
    }

    const cancellationReason = req.body.reason || 'User cancelled';
    const cancelledBy = trip.passenger.toString() === req.user.id ? 'PASSENGER' : 'DRIVER';

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason,
          cancelledBy
        },
        $push: {
          statusHistory: {
            status: 'cancelled',
            changedAt: new Date(),
            changedBy: req.user.id,
            notes: cancellationReason
          }
        }
      },
      { new: true }
    ).populate('passenger driver');

    console.log(`❌ Trip ${req.params.id} cancelled by ${cancelledBy}`);

    // Notify the other party via socket
    if (cancelledBy === 'PASSENGER' && trip.driver) {
      socketManager.notifyClient(trip.driver._id, 'trip:cancelled', {
        tripId: trip._id,
        reason: cancellationReason,
        cancelledBy: 'PASSENGER'
      });
    } else if (cancelledBy === 'DRIVER') {
      socketManager.notifyClient(trip.passenger._id, 'trip:cancelled', {
        tripId: trip._id,
        reason: cancellationReason,
        cancelledBy: 'DRIVER'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trip cancelled successfully',
      data: updatedTrip
    });
  } catch (error) {
    console.error('Cancel Trip Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel trip' });
  }
});

return router;
};
