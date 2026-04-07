const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const User = require('../models/User');
const { generateToken, authMiddleware } = require('../middleware/authMiddleware');

console.log('📁 Loading userApi routes...');

// @route   POST /api/users/register
// @desc    Send OTP to user's email for registration
// @access  Public
router.post('/register', userController.sendOTP);

// @route   POST /api/users/login
// @desc    Send OTP to user's email for login (existing users)
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

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please register first.'
      });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Log OTP for development testing - VERY IMPORTANT FOR TESTING
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔐 DEVELOPMENT MODE - LOGIN OTP');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📧 Email: ${email}`);
    console.log(`🔢 OTP Code: ${otp}`);
    console.log('⏰ Valid for 5 minutes');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Save to TempUser for verification (reuse TempUser model)
    const TempUser = require('../models/TempUser');
    await TempUser.deleteMany({ email: email.toLowerCase() });
    
    const tempUser = new TempUser({
      name: user.name,
      email: email.toLowerCase(),
      phoneNumber: user.phoneNumber,
      otp,
      isLogin: true // Flag to indicate this is a login attempt
    });

    await tempUser.save();

    // Send OTP via email
    const { sendOTPEmail } = require('../services/emailService');
    const emailResult = await sendOTPEmail(email, otp, user.name);

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email for login',
      // Development only - remove in production
      devOTP: otp
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/users/verify-otp
// @desc    Verify OTP and create permanent user
// @access  Public
router.post('/verify-otp', userController.verifyOTP);

// @route   POST /api/users/login-verify
// @desc    Verify OTP for login and return user data
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

    // Find temp user with this OTP
    const TempUser = require('../models/TempUser');
    
    console.log('Looking for temp user with:', { email: email.toLowerCase(), otp: otp.trim() });
    
    // First try to find by email and OTP
    let tempUser = await TempUser.findOne({ 
      email: email.toLowerCase(), 
      otp: otp.trim(),
      isLogin: true
    });
    
    // If not found with isLogin true, try without isLogin filter
    if (!tempUser) {
      tempUser = await TempUser.findOne({ 
        email: email.toLowerCase(), 
        otp: otp.trim()
      });
      console.log('Found temp user (without isLogin filter):', tempUser);
    } else {
      console.log('Found temp user (with isLogin):', tempUser);
    }

    if (!tempUser) {
      console.log('No temp user found with matching OTP');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Find the actual user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      await TempUser.deleteOne({ _id: tempUser._id });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete temp user
    await TempUser.deleteOne({ _id: tempUser._id });

    // Generate JWT token
    const token = generateToken(user);

    console.log('✅ User logged in successfully:', {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        balance: user.balance || 0,
        totalRides: user.totalRides || 0,
        starRating: user.starRating || 0,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Login Verify Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/users/resend-otp
// @desc    Resend OTP to email
// @access  Public
router.post('/resend-otp', userController.resendOTP);

// @route   GET /api/users
// @desc    Get all users
// @access  Public
router.get('/', userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', userController.getUserById);

// @route   PATCH /api/users/profile-picture
// @desc    Update user profile picture
// @access  Private
router.patch('/profile-picture', authMiddleware, async (req, res) => {
  try {
    const { userId, profilePicture } = req.body;

    if (!userId || !profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'User ID and profile picture are required'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: profilePicture },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update Profile Picture Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile picture'
    });
  }
});

module.exports = router;

// @route   POST /api/users/logout
// @desc    Logout user (client should discard token)
// @access  Public
router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @route   POST /api/users/validate-token
// @desc    Validate token and return user data
// @access  Private
router.post('/validate-token', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        balance: user.balance || 0,
        totalRides: user.totalRides || 0,
        starRating: user.starRating || 0,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Validate Token Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

console.log('✅ Logout and Validate Token endpoints added');

console.log('✅ userApi.js loaded successfully');
