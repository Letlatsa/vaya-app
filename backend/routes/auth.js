const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, phoneNumber, password } = req.body;

    // Validate input
    if (!name || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, phone number, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Create new user (password will be hashed by the pre-save middleware)
    const newUser = new User({
      name,
      phoneNumber,
      password
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

module.exports = router;
