// Socket.io Server Configuration & Real-Time Communication
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Trip = require('./models/Trip');
const Driver = require('./models/Driver');
const User = require('./models/User');

class SocketManager {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:3000'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authenticate socket connection
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.userId = decoded.id;
        socket.userType = decoded.userType;
        next();
      } catch (error) {
        next(new Error('Token verification failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket] User ${socket.userId} (${socket.userType}) connected`);

      // Join user-specific room
      socket.join(`user_${socket.userId}`);

      // If driver, join drivers room
      if (socket.userType === 'driver') {
        socket.join('drivers_online');
        this.updateDriverStatus(socket.userId, 'ONLINE', socket);
      }

      // ===== LOCATION UPDATES =====
      socket.on('location:update', async (data) => {
        await this.handleLocationUpdate(socket, data);
      });

      // ===== TRIP STATUS CHANGES =====
      socket.on('trip:status:update', async (data) => {
        await this.handleTripStatusUpdate(socket, data);
      });

      // ===== PAYMENT COMPLETED =====
      socket.on('payment:completed', async (data) => {
        await this.handlePaymentCompleted(socket, data);
      });

      // ===== TRIP EVENTS =====
      socket.on('trip:arrived', async (data) => {
        await this.handleTripArrived(socket, data);
      });

      socket.on('trip:started', async (data) => {
        await this.handleTripStarted(socket, data);
      });

      socket.on('trip:completed', async (data) => {
        await this.handleTripCompleted(socket, data);
      });

      // ===== RATING SUBMITTED =====
      socket.on('rating:submitted', async (data) => {
        await this.handleRatingSubmitted(socket, data);
      });

      // ===== DISCONNECT =====
      socket.on('disconnect', async () => {
        console.log(`[Socket] User ${socket.userId} disconnected`);
        if (socket.userType === 'driver') {
          this.updateDriverStatus(socket.userId, 'OFFLINE', socket);
        }
      });

      // ===== ERROR HANDLING =====
      socket.on('error', (error) => {
        console.error('[Socket Error]:', error);
      });
    });
  }

  async handleLocationUpdate(socket, data) {
    const { tripId, location } = data;

    // Validate location
    if (!this.isValidLocation(location)) {
      return socket.emit('error', { message: 'Invalid location' });
    }

    try {
      // Update driver location in database
      await Driver.findByIdAndUpdate(socket.userId, {
        $set: {
          currentLocation: {
            type: 'Point',
            coordinates: [location.lng, location.lat],
            accuracy: location.accuracy,
            updatedAt: new Date()
          }
        }
      });

      // Update trip waypoints
      if (tripId) {
        await Trip.findByIdAndUpdate(tripId, {
          $push: {
            'route.waypoints': {
              lat: location.lat,
              lng: location.lng,
              timestamp: new Date()
            }
          }
        });
      }

      // Broadcast to client in same trip
      if (tripId) {
        this.io.to(`trip_${tripId}`).emit('driver:location:updated', {
          tripId,
          driverId: socket.userId,
          location: {
            lat: location.lat,
            lng: location.lng,
            bearing: location.bearing || 0,
            speed: location.speed || 0,
            accuracy: location.accuracy,
            updatedAt: Date.now()
          }
        });
      }
    } catch (error) {
      console.error('[Location Update Error]:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  }

  async handleTripStatusUpdate(socket, data) {
    const { tripId, newStatus } = data;

    if (!tripId || !newStatus) {
      return socket.emit('error', { message: 'tripId and newStatus required' });
    }

    try {
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $set: { status: newStatus },
          $push: {
            statusHistory: {
              status: newStatus,
              changedAt: new Date(),
              changedBy: socket.userId
            }
          }
        },
        { new: true }
      ).populate('passenger driver');

      // Broadcast to both parties
      this.io.to(`trip_${tripId}`).emit('trip:status:changed', {
        tripId,
        newStatus,
        trip,
        changedAt: Date.now()
      });

      console.log(`[Trip Status] ${tripId}: ${newStatus}`);
    } catch (error) {
      console.error('[Trip Status Update Error]:', error);
      socket.emit('error', { message: 'Failed to update trip status' });
    }
  }

  async handleTripArrived(socket, data) {
    const { tripId } = data;

    try {
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $set: { status: 'arrived', arrivedAt: new Date() },
          $push: {
            statusHistory: {
              status: 'arrived',
              changedAt: new Date(),
              changedBy: socket.userId
            }
          }
        },
        { new: true }
      ).populate('passenger');

      // Notify client: "Your driver has arrived"
      this.io.to(`user_${trip.passenger._id}`).emit('driver:arrived', {
        tripId,
        message: 'Your driver has arrived; please do not keep them waiting',
        arrivedAt: new Date()
      });

      console.log(`[Driver Arrived] Trip ${tripId}`);
    } catch (error) {
      console.error('[Trip Arrived Error]:', error);
      socket.emit('error', { message: 'Failed to mark arrival' });
    }
  }

  async handleTripStarted(socket, data) {
    const { tripId } = data;

    try {
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $set: { status: 'in_progress', startedAt: new Date() },
          $push: {
            statusHistory: {
              status: 'in_progress',
              changedAt: new Date(),
              changedBy: socket.userId
            }
          }
        },
        { new: true }
      );

      // Broadcast to both parties
      this.io.to(`trip_${tripId}`).emit('trip:started', {
        tripId,
        startedAt: new Date()
      });

      console.log(`[Trip Started] ${tripId}`);
    } catch (error) {
      console.error('[Trip Started Error]:', error);
      socket.emit('error', { message: 'Failed to start trip' });
    }
  }

  async handleTripCompleted(socket, data) {
    const { tripId, actualDistance, actualDuration } = data;

    try {
      // Calculate billing
      const billing = this.calculateBilling(actualDistance, actualDuration);

      const trip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            actualDistance,
            actualDuration,
            billing
          },
          $push: {
            statusHistory: {
              status: 'completed',
              changedAt: new Date(),
              changedBy: socket.userId
            }
          }
        },
        { new: true }
      ).populate('passenger driver');

      // Notify both parties with billing
      this.io.to(`trip_${tripId}`).emit('trip:completed', {
        tripId,
        trip,
        billing,
        completedAt: new Date()
      });

      console.log(`[Trip Completed] ${tripId} - Fare: ${billing.totalCost}`);
    } catch (error) {
      console.error('[Trip Completed Error]:', error);
      socket.emit('error', { message: 'Failed to complete trip' });
    }
  }

  async handlePaymentCompleted(socket, data) {
    const { tripId, transactionId, paymentMethod } = data;

    try {
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $set: {
            'payment.status': 'completed',
            'payment.transactionId': transactionId,
            'payment.method': paymentMethod,
            'payment.completedAt': new Date()
          }
        },
        { new: true }
      ).populate('passenger driver');

      // Notify both parties
      this.io.to(`trip_${tripId}`).emit('payment:confirmed', {
        tripId,
        paymentMethod,
        transactionId,
        completedAt: new Date()
      });

      console.log(`[Payment Completed] Trip ${tripId}`);
    } catch (error) {
      console.error('[Payment Completed Error]:', error);
      socket.emit('error', { message: 'Failed to process payment notification' });
    }
  }

  async handleRatingSubmitted(socket, data) {
    const { tripId, score, feedback, ratedUserId } = data;

    try {
      // Update user's average rating
      const user = await User.findById(ratedUserId);
      const newAverage = ((user.averageRating * user.totalRatings) + score) / (user.totalRatings + 1);

      await User.findByIdAndUpdate(ratedUserId, {
        $set: { averageRating: parseFloat(newAverage.toFixed(1)) },
        $inc: { totalRatings: 1 }
      });

      // Notify other party of rating
      this.io.to(`user_${ratedUserId}`).emit('rating:received', {
        tripId,
        score,
        feedback,
        newAverageRating: newAverage
      });

      console.log(`[Rating] Trip ${tripId}: ${score}/5 stars`);
    } catch (error) {
      console.error('[Rating Error]:', error);
      socket.emit('error', { message: 'Failed to process rating' });
    }
  }

  async updateDriverStatus(driverId, status, socket = null) {
    try {
      await Driver.findByIdAndUpdate(driverId, {
        $set: {
          status,
          lastStatusUpdate: new Date()
        }
      });

      if (socket) {
        this.io.emit('driver:status:changed', {
          driverId,
          status,
          changedAt: new Date()
        });
      }
    } catch (error) {
      console.error('[Driver Status Update Error]:', error);
    }
  }

  isValidLocation(location) {
    return (
      location.lat >= -90 && location.lat <= 90 &&
      location.lng >= -180 && location.lng <= 180 &&
      location.accuracy > 0 && location.accuracy <= 100
    );
  }

  calculateBilling(distanceKm, durationMinutes) {
    const baseFare = 5.00;
    const distanceCharge = distanceKm * 10.00;
    const timeCharge = durationMinutes * 0.15;
    const subtotal = Math.max(baseFare, distanceCharge + timeCharge);
    const tax = subtotal * 0.05;
    const totalCost = subtotal + tax;

    return {
      baseFare,
      distanceCharge,
      timeCharge,
      subtotal,
      tax,
      totalCost,
      distanceKm,
      durationMinutes
    };
  }

  broadcastRideRequest(requestData, nearbyDriverIds) {
    if (!nearbyDriverIds || nearbyDriverIds.length === 0) {
      console.log('[Broadcast] No drivers available');
      return;
    }

    nearbyDriverIds.forEach(driverId => {
      this.io.to(`user_${driverId}`).emit('ride:request:new', {
        requestId: requestData._id,
        clientId: requestData.clientId,
        clientLocation: requestData.pickupLocation,
        destination: requestData.destination,
        estimatedDistance: requestData.distance,
        estimatedFare: requestData.price,
        requestTimestamp: Date.now()
      });
    });

    console.log(`[Broadcast] Request sent to ${nearbyDriverIds.length} drivers`);
  }

  joinTripRoom(socket, tripId) {
    socket.join(`trip_${tripId}`);
  }

  leaveTripRoom(socket, tripId) {
    socket.leave(`trip_${tripId}`);
  }

  notifyClient(clientId, event, data) {
    this.io.to(`user_${clientId}`).emit(event, data);
  }

  notifyDriver(driverId, event, data) {
    this.io.to(`user_${driverId}`).emit(event, data);
  }
}

module.exports = SocketManager;
