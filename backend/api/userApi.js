const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', userController.registerUser);

// @route   GET /api/users
// @desc    Get all users
// @access  Public
router.get('/', userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', userController.getUserById);

module.exports = router;
