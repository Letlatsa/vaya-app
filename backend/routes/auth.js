const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/register - Register a new user
router.post('/register', async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
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

    // Return success response (without sending back the password)
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
});

// GET /api/user/:id - Get user profile
router.get('/user/:id', async (req, res) => {
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
      message: 'Server error while fetching user'
    });
  }
});

// PATCH /api/user/profile-picture - Update profile picture
router.patch('/user/profile-picture', async (req, res) => {
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
