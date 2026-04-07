const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');

console.log('📁 Loading driverApi routes...');

// @route   POST /api/drivers/register
// @desc    Register a new driver application
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      profilePicture,
      licenseNumber,
      licenseFront,
      licenseBack,
      carMake,
      carModel,
      registrationNumber,
      carColor,
      passengerCount
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !licenseNumber || 
        !carMake || !carModel || !registrationNumber || !carColor || !passengerCount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if driver with this email already exists
    const existingDriver = await Driver.findOne({ email: email.toLowerCase() });
    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'A driver application with this email already exists'
      });
    }

    // Check if driver with this license number already exists
    const existingLicense = await Driver.findOne({ licenseNumber });
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'A driver application with this license number already exists'
      });
    }

    // Create new driver
    const driver = new Driver({
      fullName,
      email: email.toLowerCase(),
      phoneNumber,
      profilePicture,
      licenseNumber,
      licenseFront,
      licenseBack,
      carMake,
      carModel,
      registrationNumber: registrationNumber.toUpperCase(),
      carColor,
      passengerCount,
      status: 'pending'
    });

    await driver.save();

    console.log('✅ Driver application submitted:', {
      id: driver._id,
      name: driver.fullName,
      email: driver.email
    });

    res.status(201).json({
      success: true,
      message: 'Driver application submitted successfully',
      data: {
        id: driver._id,
        fullName: driver.fullName,
        email: driver.email,
        status: driver.status
      }
    });

  } catch (error) {
    console.error('Driver Registration Error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while submitting application'
    });
  }
});

// @route   GET /api/drivers
// @desc    Get all drivers (admin only)
// @access  Public (for now, add auth middleware later)
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find({}).select('-__v');
    
    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    console.error('Get Drivers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/drivers/:id
// @desc    Get driver by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).select('-__v');
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Get Driver Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

console.log('✅ driverApi.js loaded successfully');

module.exports = router;