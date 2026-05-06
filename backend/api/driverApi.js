const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const TempDriver = require('../models/TempDriver');
const { sendOTPEmail } = require('../services/emailService');
const { generateToken } = require('../middleware/authMiddleware');

console.log('📁 Loading driverApi routes...');

// @route   POST /api/drivers/login
// @desc    Send OTP to driver's email for login (existing drivers)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
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

    // Check if driver exists
    const driver = await Driver.findOne({ email: email.toLowerCase() });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'No driver account found with this email. Please register first.'
      });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Log OTP for development testing - VERY IMPORTANT FOR TESTING
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔐 DEVELOPMENT MODE - DRIVER LOGIN OTP');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📧 Email: ${email}`);
    console.log(`🔢 OTP Code: ${otp}`);
    console.log('⏰ Valid for 5 minutes');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Save to TempDriver for verification
    await TempDriver.deleteMany({ email: email.toLowerCase() });
    
    const tempDriver = new TempDriver({
      email: email.toLowerCase(),
      otp,
      isLogin: true // Flag to indicate this is a login attempt
    });

    await tempDriver.save();

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp, driver.fullName);

    let responseMessage = 'OTP sent to your email for login';
    let note = undefined;
    
    if (!emailResult.delivered) {
      // Email wasn't delivered but OTP is available via console and devOTP
      note = emailResult.note || 'OTP is logged in terminal and available for testing';
      responseMessage = 'OTP generated (email delivery failed). Check terminal for OTP';
    }

    const response = {
      success: true,
      message: responseMessage,
      // Development only - remove in production
      devOTP: otp
    };
    
    if (note) {
      response.note = note;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Driver Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/drivers/login-verify
// @desc    Verify OTP for driver login and return driver data
// @access  Public
router.post('/login-verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    console.log('Looking for temp driver with:', { email: email.toLowerCase(), otp: otp.trim() });
    
    // First try to find by email and OTP with isLogin flag
    let tempDriver = await TempDriver.findOne({ 
      email: email.toLowerCase(), 
      otp: otp.trim(),
      isLogin: true
    });
    
    // If not found with isLogin true, try without isLogin filter
    if (!tempDriver) {
      tempDriver = await TempDriver.findOne({ 
        email: email.toLowerCase(), 
        otp: otp.trim()
      });
      console.log('Found temp driver (without isLogin filter):', tempDriver);
    } else {
      console.log('Found temp driver (with isLogin):', tempDriver);
    }

    if (!tempDriver) {
      console.log('No temp driver found with matching OTP');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Find the actual driver
    const driver = await Driver.findOne({ email: email.toLowerCase() });

    if (!driver) {
      await TempDriver.deleteOne({ _id: tempDriver._id });
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Delete temp driver
    await TempDriver.deleteOne({ _id: tempDriver._id });

    // Generate JWT token
    const token = generateToken(driver);

    console.log('✅ Driver logged in successfully:', {
      id: driver._id,
      fullName: driver.fullName,
      email: driver.email,
      status: driver.status
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      data: {
        _id: driver._id,
        fullName: driver.fullName,
        email: driver.email,
        phoneNumber: driver.phoneNumber,
        status: driver.status,
        profilePicture: driver.profilePicture,
        licenseNumber: driver.licenseNumber,
        carMake: driver.carMake,
        carModel: driver.carModel,
        carColor: driver.carColor
      }
    });

  } catch (error) {
    console.error('Driver Login Verify Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

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