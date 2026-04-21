# Vaya Cabs - Location & Pricing Features

## Overview
Enhanced Vaya Cabs backend with location input, distance calculation, time estimation, and dynamic pricing.

## New Features

### 1. Location Input Methods
- **Text Input**: Users can type addresses in input fields
- **Map Pinning**: Users can click/tap on an interactive map to set locations

### 2. Distance & Time Calculation
- **Straight-line distance** using Haversine formula
- **Travel time estimation** based on 40 km/h average urban speed
- **Real-time updates** as locations are adjusted

### 3. Dynamic Pricing
- **Base fare**: M50 for trips ≤ 5.0 km
- **Per-kilometer rate**: M10 for each km over 5.0 km
- **Formula**: `Fare = M50 + M10 × (distance - 5)` for distance > 5km

### 4. Mapping Integration
- **Google Maps API** integration for accurate geocoding and routing
- **Fallback to straight-line** calculations when API unavailable

## API Endpoints

### Geocoding
```javascript
// Convert address to coordinates
POST /api/trips/geocode
{
  "address": "Sandton City, Johannesburg, South Africa"
}

// Response
{
  "success": true,
  "data": {
    "coordinates": { "lat": -26.1076, "lng": 28.0567 },
    "address": "Sandton City Shopping Centre, Sandton, South Africa"
  }
}
```

### Reverse Geocoding
```javascript
// Convert coordinates to address
POST /api/trips/reverse-geocode
{
  "lat": -26.2041,
  "lng": 28.0473
}

// Response
{
  "success": true,
  "data": { "address": "Sandton, Johannesburg, South Africa" }
}
```

### Trip Estimation
```javascript
// Calculate distance, time, and fare
POST /api/trips/estimate
{
  "pickupCoords": { "lat": -26.2041, "lng": 28.0473 },
  "destinationCoords": { "lat": -26.1952, "lng": 28.0305 }
}

// Response
{
  "success": true,
  "data": {
    "pickup": {
      "coordinates": { "lat": -26.2041, "lng": 28.0473 },
      "address": "Sandton, Johannesburg, South Africa"
    },
    "destination": {
      "coordinates": { "lat": -26.1952, "lng": 28.0305 },
      "address": "Rosebank, Johannesburg, South Africa"
    },
    "distance": { "value": 1.9, "text": "1.9 km" },
    "duration": { "value": 180, "text": "3 min" },
    "fare": 50,
    "pricing": {
      "baseFare": 50,
      "perKmRate": 10,
      "calculation": "Base fare: M50 (distance ≤ 5km)"
    }
  }
}
```

### Trip Booking (Updated)
```javascript
// Book a trip with automatic pricing
POST /api/trips
{
  "pickupCoords": { "lat": -26.2041, "lng": 28.0473 },
  "pickupLabel": "Sandton City",
  "destinationCoords": { "lat": -26.1952, "lng": 28.0305 },
  "destinationLabel": "Rosebank Mall",
  "rideType": "Standard"
}

// Response includes calculated distance, time, and pricing details
```

## Environment Setup

### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Geocoding API
   - Directions API
   - Maps JavaScript API
4. Create an API key
5. Add to `.env`:
```
GOOGLE_MAPS_API_KEY=your-api-key-here
```

### Without API Key
The system falls back to straight-line distance calculations and coordinate-based addresses.

## Frontend Implementation Guide

### 1. Map Integration
```javascript
// Initialize Google Maps
const map = new google.maps.Map(document.getElementById('map'), {
  center: { lat: -26.2041, lng: 28.0473 },
  zoom: 12
});

// Add markers for pickup and destination
let pickupMarker, destinationMarker;

map.addListener('click', (event) => {
  if (!pickupMarker) {
    // Set pickup location
    pickupMarker = new google.maps.Marker({
      position: event.latLng,
      map: map,
      label: 'P'
    });
    updatePickupCoords(event.latLng);
  } else if (!destinationMarker) {
    // Set destination location
    destinationMarker = new google.maps.Marker({
      position: event.latLng,
      map: map,
      label: 'D'
    });
    updateDestinationCoords(event.latLng);
  }
});
```

### 2. Address Autocomplete
```javascript
// Google Places Autocomplete
const pickupInput = document.getElementById('pickup-input');
const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput);

pickupAutocomplete.addListener('place_changed', () => {
  const place = pickupAutocomplete.getPlace();
  if (place.geometry) {
    updatePickupCoords({
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    });
  }
});
```

### 3. Real-time Fare Updates
```javascript
async function updateEstimate() {
  if (pickupCoords && destinationCoords) {
    try {
      const response = await fetch('/api/trips/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupCoords,
          destinationCoords
        })
      });

      const result = await response.json();
      if (result.success) {
        displayEstimate(result.data);
      }
    } catch (error) {
      console.error('Failed to get estimate:', error);
    }
  }
}

function displayEstimate(data) {
  document.getElementById('distance').textContent = data.distance.text;
  document.getElementById('duration').textContent = data.duration.text;
  document.getElementById('fare').textContent = `M${data.fare.toFixed(2)}`;
  document.getElementById('pricing-details').textContent = data.pricing.calculation;
}
```

### 4. UI Elements Checklist
- [ ] Interactive map with click-to-set locations
- [ ] Address input fields with autocomplete
- [ ] Visual markers for pickup (P) and destination (D)
- [ ] Real-time distance, time, and fare display
- [ ] Clear pricing breakdown
- [ ] Confirm booking button (enabled only when both locations set)

## Testing

Run the included test script:
```bash
node test-location-features.js
```

This tests:
- Reverse geocoding
- Geocoding (requires API key)
- Trip estimation with pricing logic
- Short vs long trip pricing validation

## Pricing Examples

| Distance | Calculation | Fare |
|----------|-------------|------|
| 2.0 km | Base fare (≤5km) | M50.00 |
| 8.5 km | M50 + M10 × 3.5 | M85.00 |
| 15.0 km | M50 + M10 × 10.0 | M150.00 |

## Notes
- All coordinates use `{ lat, lng }` format (latitude first)
- MongoDB stores coordinates as `[lng, lat]` (longitude first) for GeoJSON
- Fallback calculations work without Google Maps API
- Average speed assumption: 40 km/h (adjustable in `tripService.js`)