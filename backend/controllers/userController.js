const User = require('../models/User');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;

    // Validate input
    if (!name || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and phone number'
      });
    }

    // Check if user already exists by phone number
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      console.log('❌ Registration failed: Phone number already exists:', phoneNumber);
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log('❌ Registration failed: Email already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      phoneNumber
    });

    // Save user to database
    await newUser.save();

    // Log successful registration
    console.log('✅ User registered successfully:', {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      createdAt: newUser.createdAt
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role
      }
    });

  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    // Handle duplicate key error (for phone number)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Server error
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
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
  registerUser,
  getAllUsers,
  getUserById
};
