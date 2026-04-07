const User = require('../models/User');
const TempUser = require('../models/TempUser');
const { sendOTPEmail } = require('../services/emailService');
const { generateToken } = require('../middleware/authMiddleware');

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number'
      });
    }

    // Check if user already exists in permanent collection (DUPLICATE CHECK)
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { phoneNumber: cleanPhone }]
    });
    
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'phone number';
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    // Delete any existing temp user with same email
    await TempUser.deleteMany({ email: email.toLowerCase() });

    // Generate OTP
    const otp = generateOTP();
    
    // Log OTP for development testing - VERY IMPORTANT FOR TESTING
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🔐 DEVELOPMENT MODE - REGISTRATION OTP');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🔢 OTP Code: ${otp}`);
    console.log('⏰ Valid for 5 minutes');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Save to TempUser collection
    const tempUser = new TempUser({
      name,
      email: email.toLowerCase(),
      phoneNumber: cleanPhone,
      otp
    });

    await tempUser.save();

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp, name);

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email for verification',
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
    const tempUser = await TempUser.findOne({ 
      email: email.toLowerCase(), 
      otp: otp 
    });

    if (!tempUser) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Final duplicate check before creating user
    const existingUser = await User.findOne({
      $or: [
        { email: tempUser.email },
        { phoneNumber: tempUser.phoneNumber }
      ]
    });

    if (existingUser) {
      await TempUser.deleteOne({ _id: tempUser._id });
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone number'
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

    // Generate JWT token
    const token = generateToken(newUser);

    console.log('✅ User registered successfully:', {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: token,
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

// @desc    Resend OTP
// @route   POST /api/users/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }

    // Find existing temp user
    const tempUser = await TempUser.findOne({ email: email.toLowerCase() });

    if (!tempUser) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found with this email'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    tempUser.otp = otp;
    await tempUser.save();

    // Send new OTP via email
    await sendOTPEmail(email, otp, tempUser.name);

    console.log('📧 New OTP for', email, ':', otp);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
      devOTP: otp
    });

  } catch (error) {
    console.error('Resend OTP Error:', error);
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
  resendOTP,
  getAllUsers,
  getUserById
};
