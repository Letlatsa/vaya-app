import React from 'react';

export interface ActiveRideMapProps {
  driverLocation: { lat: number; lng: number } | null;
  pickupLocation: { lat: number; lng: number; address: string };
  routeCoords: { latitude: number; longitude: number }[];
}

// Lazy load based on platform, but delay the require to avoid static analysis
let Component: React.ComponentType<ActiveRideMapProps> | null = null;

function getComponent() {
  if (Component) return Component;
  
  try {
    // This require is evaluated at runtime, not at bundle time
    // so Metro won't try to analyze the native component on web
    const { Platform } = require('react-native');
    
    if (Platform.OS === 'web') {
      Component = require('./ActiveRideMap.web').default;
    } else {
      Component = require('./ActiveRideMap.native').default;
    }
  } catch (e) {
    console.warn('Failed to load ActiveRideMap:', e);
    // Return a fallback empty component
    Component = () => null;
  }
  
  return Component;
}

const ActiveRideMapContainer: React.FC<ActiveRideMapProps> = (props) => {
  const Comp = getComponent();
  return Comp ? <Comp {...props} /> : null;
};

export default ActiveRideMapContainer;
