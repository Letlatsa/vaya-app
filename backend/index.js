const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userApi = require('./api/userApi');
const driverApi = require('./api/driverApi');
const tripApi = require('./api/tripApi');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/users', userApi);
app.use('/api/drivers', driverApi);
app.use('/api/trips', tripApi);

// Debug: verify routes are loaded
console.log('✅ Routes loaded: /api/users, /api/drivers, /api/trips');

// Log available routes on startup
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('📡 Available API Routes:');
console.log('═══════════════════════════════════════════════════');
console.log('  POST /api/users/register - Send OTP for registration');
console.log('  POST /api/users/login - Send OTP for login');
console.log('  POST /api/users/login-verify - Verify login OTP');
console.log('  POST /api/users/verify-otp - Verify registration OTP');
console.log('  POST /api/users/resend-otp - Resend OTP');
console.log('  GET  /api/users/:id - Get user by ID');
console.log('  POST /api/drivers/register - Register driver application');
console.log('  GET  /api/drivers - Get all drivers');
console.log('  GET  /api/drivers/:id - Get driver by ID');
console.log('  POST /api/trips/geocode - Convert address to coordinates');
console.log('  POST /api/trips/reverse-geocode - Convert coordinates to address');
console.log('  POST /api/trips/estimate - Calculate distance, time, and fare');
console.log('  POST /api/trips - Book a ride');
console.log('  GET  /api/trips/my-rides - Get rider\'s trip history');
console.log('  GET  /api/trips/pending - Get pending trips (drivers)');
console.log('  PATCH /api/trips/:id/accept - Accept a trip (driver)');
console.log('  GET  /api/trips/:id/status - Poll trip status (rider)');
console.log('  PATCH /api/trips/:id/cancel - Cancel a trip (rider)');
console.log('═══════════════════════════════════════════════════');
console.log('');

// Basic Route
app.get('/', (req, res) => {
  res.send('Vaya Backend is LIVE! 🚀');
});

// Fallback for 404s - helpful for debugging
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: [
      'GET /',
      'POST /api/users/register',
      'POST /api/users/login',
      'POST /api/users/login-verify',
      'POST /api/users/verify-otp',
      'POST /api/users/resend-otp',
      'GET /api/users/:id',
      'POST /api/drivers/register',
      'GET /api/drivers',
      'GET /api/drivers/:id',
      'POST /api/trips/geocode',
      'POST /api/trips/reverse-geocode',
      'POST /api/trips/estimate',
      'POST /api/trips',
      'GET /api/trips/my-rides',
      'GET /api/trips/pending',
      'PATCH /api/trips/:id/accept',
      'GET /api/trips/:id/status',
      'PATCH /api/trips/:id/cancel'
    ]
  });
});

// MongoDB Connection using MONGO_URI from .env file
const MONGO_URI = process.env.MONGO_URI;

// Validate MONGO_URI is defined
if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`📡 Server running on http://localhost:${PORT}`);
});