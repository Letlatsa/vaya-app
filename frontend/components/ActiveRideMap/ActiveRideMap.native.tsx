import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

export interface ActiveRideMapProps {
  driverLocation: { lat: number; lng: number } | null;
  pickupLocation: { lat: number; lng: number; address: string };
  routeCoords: { latitude: number; longitude: number }[];
}

export default function ActiveRideMap({ driverLocation, pickupLocation, routeCoords }: ActiveRideMapProps) {
  const initialRegion = driverLocation
    ? {
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude: pickupLocation.lat,
        longitude: pickupLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      {driverLocation ? (
        <MapView style={styles.map} region={initialRegion}>
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Driver"
            description="Current driver location"
          />
          <Marker
            coordinate={{ latitude: pickupLocation.lat, longitude: pickupLocation.lng }}
            title="Pickup"
            description={pickupLocation.address}
            pinColor="green"
          />
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor="#FF6B00" strokeWidth={4} />
          )}
        </MapView>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Waiting for driver location...</Text>
          <Text style={styles.placeholderSubtext}>{pickupLocation.address}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  placeholder: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
});
