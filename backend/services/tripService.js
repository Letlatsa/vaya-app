const axios = require('axios');

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Calculate estimated travel time based on distance and average speed
const calculateTravelTime = (distanceKm, averageSpeedKmh = 40) => {
  const timeHours = distanceKm / averageSpeedKmh;
  const timeMinutes = Math.ceil(timeHours * 60);
  return {
    hours: Math.floor(timeHours),
    minutes: timeMinutes,
    formatted: timeMinutes < 60 ? `${timeMinutes} min` : `${Math.floor(timeHours)}h ${timeMinutes % 60}min`
  };
};

// Calculate fare based on distance
const calculateFare = (distanceKm) => {
  const BASE_FARE = 60; // M60 base fare
  const PER_KM_RATE = 10; // M10 per kilometer

  if (distanceKm <= 5.0) {
    return BASE_FARE;
  } else {
    return BASE_FARE + (distanceKm * PER_KM_RATE);
  }
};

// Get address from coordinates using Google Maps Geocoding API
const getAddressFromCoords = async (lat, lng) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not configured, returning coordinates as address');
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

// Get coordinates from address using Google Maps Geocoding API
const getCoordsFromAddress = async (address) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );

    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        address: response.data.results[0].formatted_address
      };
    }

    throw new Error('Address not found');
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    throw error;
  }
};

// Calculate route distance and time using Google Maps Directions API (more accurate than straight-line)
const getRouteDetails = async (originLat, originLng, destLat, destLng) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // Fallback to straight-line calculation
      console.warn('Google Maps API key not configured, using straight-line distance');
      const distance = calculateDistance(originLat, originLng, destLat, destLng);
      const time = calculateTravelTime(distance);
      const fare = calculateFare(distance);

      return {
        distance: {
          value: distance,
          text: `${distance.toFixed(1)} km`
        },
        duration: {
          value: time.minutes * 60, // seconds
          text: time.formatted
        },
        fare: fare,
        route: null // No route data available
      };
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${apiKey}`
    );

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];

      const distanceKm = leg.distance.value / 1000; // Convert meters to km
      const fare = calculateFare(distanceKm);

      return {
        distance: {
          value: distanceKm,
          text: leg.distance.text
        },
        duration: {
          value: leg.duration.value,
          text: leg.duration.text
        },
        fare: fare,
        route: route.overview_polyline.points, // Encoded polyline for map display
        steps: leg.steps // Detailed route steps
      };
    }

    // Fallback if no route found
    const distance = calculateDistance(originLat, originLng, destLat, destLng);
    const time = calculateTravelTime(distance);
    const fare = calculateFare(distance);

    return {
      distance: {
        value: distance,
        text: `${distance.toFixed(1)} km`
      },
      duration: {
        value: time.minutes * 60,
        text: time.formatted
      },
      fare: fare,
      route: null
    };
  } catch (error) {
    console.error('Route calculation error:', error.message);

    // Final fallback to straight-line calculation
    const distance = calculateDistance(originLat, originLng, destLat, destLng);
    const time = calculateTravelTime(distance);
    const fare = calculateFare(distance);

    return {
      distance: {
        value: distance,
        text: `${distance.toFixed(1)} km`
      },
      duration: {
        value: time.minutes * 60,
        text: time.formatted
      },
      fare: fare,
      route: null
    };
  }
};

module.exports = {
  calculateDistance,
  calculateTravelTime,
  calculateFare,
  getAddressFromCoords,
  getCoordsFromAddress,
  getRouteDetails
};