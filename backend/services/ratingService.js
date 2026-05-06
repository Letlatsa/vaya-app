// Rating Service - Handle trip ratings and driver reviews
const User = require('../models/User');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');

class RatingService {
  /**
   * Submit rating for a trip
   */
  async submitRating(tripId, ratedUserId, raterUserId, score, feedback, tags = []) {
    try {
      // Validate rating score
      if (score < 1 || score > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Update trip with rating
      const tripUpdate = {};
      // Determine if it's a client rating driver or driver rating client
      const rater = await User.findById(raterUserId);
      
      if (rater.userType === 'client') {
        tripUpdate['ratings.driverRating'] = {
          score,
          feedback,
          ratedAt: new Date()
        };
      } else {
        tripUpdate['ratings.clientRating'] = {
          score,
          feedback,
          ratedAt: new Date()
        };
      }

      const trip = await Trip.findByIdAndUpdate(tripId, tripUpdate, { new: true });

      // Update user's average rating
      const ratedUser = await User.findById(ratedUserId);
      
      // Get all ratings for this user from trips
      const allRatings = await Trip.find({
        $or: [
          {
            'ratings.driverRating.score': { $exists: true },
            driver: ratedUserId
          },
          {
            'ratings.clientRating.score': { $exists: true },
            passenger: ratedUserId
          }
        ]
      });

      let totalScore = 0;
      let ratingCount = 0;

      allRatings.forEach(trip => {
        if (trip.driver?.toString() === ratedUserId.toString() && trip.ratings.driverRating.score) {
          totalScore += trip.ratings.driverRating.score;
          ratingCount++;
        } else if (trip.passenger?.toString() === ratedUserId.toString() && trip.ratings.clientRating.score) {
          totalScore += trip.ratings.clientRating.score;
          ratingCount++;
        }
      });

      const newAverageRating = ratingCount > 0 ? (totalScore / ratingCount) : 0;

      // Update user profile
      await User.findByIdAndUpdate(ratedUserId, {
        $set: {
          averageRating: parseFloat(newAverageRating.toFixed(1)),
          totalRatings: ratingCount
        }
      });

      // If it's a driver, also update driver model
      if (rater.userType === 'client') {
        const driver = await Driver.findOne({ userId: ratedUserId });
        if (driver) {
          await Driver.findByIdAndUpdate(driver._id, {
            $set: {
              rating: parseFloat(newAverageRating.toFixed(1)),
              averageRating: parseFloat(newAverageRating.toFixed(1))
            },
            $push: {
              ratings: {
                tripId,
                clientId: raterUserId,
                score,
                feedback,
                createdAt: new Date()
              }
            }
          });
        }
      }

      return {
        success: true,
        rating: score,
        newAverageRating: parseFloat(newAverageRating.toFixed(1)),
        totalRatings: ratingCount
      };
    } catch (error) {
      console.error('[SubmitRating Error]:', error);
      throw error;
    }
  }

  /**
   * Get user ratings
   */
  async getUserRatings(userId, limit = 10, skip = 0) {
    try {
      // Get all trips where this user was rated
      const trips = await Trip.find({
        $or: [
          { 'ratings.driverRating.score': { $exists: true, $ne: null }, driver: userId },
          { 'ratings.clientRating.score': { $exists: true, $ne: null }, passenger: userId }
        ]
      })
        .populate('passenger', 'fullName profilePicture')
        .populate('driver', 'fullName profilePicture carMake carModel')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const ratings = [];

      trips.forEach(trip => {
        if (trip.driver?._id?.toString() === userId.toString() && trip.ratings.driverRating.score) {
          ratings.push({
            tripId: trip._id,
            score: trip.ratings.driverRating.score,
            feedback: trip.ratings.driverRating.feedback,
            ratedBy: trip.passenger,
            ratedAt: trip.ratings.driverRating.ratedAt,
            type: 'DRIVER'
          });
        }

        if (trip.passenger?._id?.toString() === userId.toString() && trip.ratings.clientRating.score) {
          ratings.push({
            tripId: trip._id,
            score: trip.ratings.clientRating.score,
            feedback: trip.ratings.clientRating.feedback,
            ratedBy: trip.driver,
            ratedAt: trip.ratings.clientRating.ratedAt,
            type: 'CLIENT'
          });
        }
      });

      return ratings;
    } catch (error) {
      console.error('[GetUserRatings Error]:', error);
      throw error;
    }
  }

  /**
   * Get driver's average rating
   */
  async getDriverAverageRating(driverId) {
    try {
      const driver = await Driver.findOne({ userId: driverId });
      
      return {
        driverId,
        averageRating: driver?.rating || 0,
        totalRatings: driver?.totalRatings || 0,
        ratingDistribution: await this.getRatingDistribution(driverId)
      };
    } catch (error) {
      console.error('[GetDriverAverageRating Error]:', error);
      throw error;
    }
  }

  /**
   * Get rating distribution (how many 5-star, 4-star, etc.)
   */
  async getRatingDistribution(userId) {
    try {
      const trips = await Trip.find({
        'ratings.driverRating.score': { $exists: true, $ne: null },
        driver: userId
      });

      const distribution = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0
      };

      trips.forEach(trip => {
        if (trip.ratings.driverRating.score) {
          distribution[trip.ratings.driverRating.score]++;
        }
      });

      return distribution;
    } catch (error) {
      console.error('[GetRatingDistribution Error]:', error);
      return {};
    }
  }
}

module.exports = new RatingService();
