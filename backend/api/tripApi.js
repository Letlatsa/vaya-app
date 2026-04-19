const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const { authMiddleware } = require('../middleware/authMiddleware');

// @route  POST /api/trips
// @desc   Rider creates a new trip (places booking)
// @access Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { pickupCoords, pickupLabel, destinationCoords, destinationLabel, rideType, price } = req.body;

    if (!pickupCoords || !destinationCoords || !price) {
      return res.status(400).json({ success: false, message: 'Pickup, destination and price are required' });
    }

    const trip = new Trip({
      pickupLocation: {
        type: 'Point',
        coordinates: [pickupCoords.lng, pickupCoords.lat],
        address: pickupLabel,
      },
      destination: {
        type: 'Point',
        coordinates: [destinationCoords.lng, destinationCoords.lat],
        address: destinationLabel,
      },
      price,
      rideType: rideType || 'Standard',
      passenger: req.user.id,
      status: 'pending',
    });

    await trip.save();
    await trip.populate('passenger', 'name phoneNumber profilePicture');

    console.log(`🚖 New trip booked by ${req.user.id} — Trip ID: ${trip._id}`);

    res.status(201).json({ success: true, message: 'Trip booked successfully', data: trip });
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
