const User = require('../models/User');
const TempUser = require('../models/TempUser');
const { sendOTPEmail } = require('../services/emailService');

// Generate a 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// @desc    Send OTP to user's email
// @route   POST /api/users/register
// @access  Public
const sendOTP = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;

    // Validate input
    if (!name || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and phone number'
      });
    }

    // Check if user already exists in permanent collection
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phoneNumber }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone number already exists'
      });
    }

    // Delete any existing temp user with same email
    await TempUser.deleteMany({ email });

    // Generate OTP
    const otp = generateOTP();
    
    // Log OTP for development testing
    console.log('📱 OTP for', email, ':', otp);

    // Save to TempUser collection
    const tempUser = new TempUser({
      name,
      email,
      phoneNumber,
      otp
    });

    await tempUser.save();

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp, name);

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      // Still return success since we saved the OTP for testing
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      // Remove this in production - for testing only
      devOTP: otp
    });

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Verify OTP and create permanent user
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    // Find temp user
    const tempUser = await TempUser.findOne({ email, otp });

    if (!tempUser) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Create permanent user
    const newUser = new User({
      name: tempUser.name,
      email: tempUser.email,
      phoneNumber: tempUser.phoneNumber
    });

    await newUser.save();

    // Delete temp user
    await TempUser.deleteOne({ _id: tempUser._id });

    console.log('✅ User registered successfully:', {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  getAllUsers,
  getUserById
};
