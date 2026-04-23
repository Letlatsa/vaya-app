const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  calculateDistance,
  calculateTravelTime,
  calculateFare,
  getAddressFromCoords,
  getCoordsFromAddress,
  getRouteDetails
} = require('../services/tripService');

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
    await trip.populate('driver', 'name phoneNumber profilePicture');

    console.log(`✅ Trip ${trip._id} accepted by driver ${req.user.id}`);

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
      .populate('driver', 'name phoneNumber profilePicture');

    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    res.status(200).json({ success: true, data: { status: trip.status, driver: trip.driver } });
  } catch (error) {
    console.error('Trip Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  PATCH /api/trips/:id/cancel
// @desc   Rider cancels a pending trip
// @access Private
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.passenger.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (trip.status === 'active') return res.status(400).json({ success: false, message: 'Cannot cancel an active trip' });

    trip.status = 'cancelled';
    await trip.save();

    res.status(200).json({ success: true, message: 'Trip cancelled' });
  } catch (error) {
    console.error('Cancel Trip Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
