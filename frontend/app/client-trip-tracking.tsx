import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, SafeAreaView, Animated, Platform, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserContext } from './_layout';
import api from '@/constants/apiConfig';
import io from 'socket.io-client';

const { width: W, height: H } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';

interface Trip {
  _id: string;
  passenger: { name: string; phone: string };
  driver: { name: string; phone: string; vehicle: string; rating: number };
  pickupLocation: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  status: string;
  estimatedTime: number;
  currentDistance: number;
  estimatedFare: number;
  distanceCovered: number;
  startedAt?: Date;
}

export default function ClientTripTracking() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();
  const { userData, token } = useContext(UserContext);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    loadTrip();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const response = await api.get(`/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrip(response.data.data);
    } catch (error) {
      console.error('Load Trip Error:', error);
      alert('Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = () => {
    socketRef.current = io(Platform.OS === 'web' ? 'http://localhost:5000' : 'http://10.0.2.2:5000', {
      auth: { token },
      reconnection: true
    });

    socketRef.current.on('driver:location', (data: { lat: number; lng: number }) => {
      setDriverLocation(data);
      if (trip) {
        // Calculate ETA based on new position
        calculateEta(data.lat, data.lng, trip.destination.lat, trip.destination.lng);
      }
    });

    socketRef.current.on('trip:status-changed', (data: { status: string; trip: Trip }) => {
      setTrip(data.trip);
      if (data.status === 'completed') {
        router.push(`/client-payment?tripId=${tripId}`);
      }
    });

    socketRef.current.on('notification:driver-arrived', () => {
      Alert.alert(
        'Driver Arrived',
        'Your driver has arrived! Please do not keep them waiting.',
        [{ text: 'OK' }]
      );
    });
  };

  const calculateEta = (driverLat: number, driverLng: number, destLat: number, destLng: number) => {
    // Haversine formula for simple distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (destLat - driverLat) * Math.PI / 180;
    const dLng = (destLng - driverLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(driverLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    // Assume 30 km/h average speed
    const timeMinutes = Math.ceil((distance / 30) * 60);
    setEta(timeMinutes);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading trip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Trip not found</Text>
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>📍 Driver Location Tracking</Text>
          {driverLocation && (
            <Text style={styles.coordsText}>
              ({driverLocation.lat.toFixed(6)}, {driverLocation.lng.toFixed(6)})
            </Text>
          )}
        </View>
      </View>

      {/* Trip Info Card */}
      <View style={styles.tripCard}>
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {trip.status === 'active' ? '🚗 En Route' : trip.status === 'completed' ? '✓ Completed' : 'Pending'}
          </Text>
        </View>

        {/* Driver Info */}
        {trip.driver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver</Text>
            <View style={styles.driverInfo}>
              <View>
                <Text style={styles.driverName}>{trip.driver.name}</Text>
                <Text style={styles.driverDetails}>{trip.driver.vehicle}</Text>
                <Text style={styles.driverRating}>⭐ {trip.driver.rating.toFixed(1)} Rating</Text>
              </View>
              <TouchableOpacity style={styles.callButton}>
                <Text style={styles.callButtonText}>📞 Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ETA */}
        {eta !== null && (
          <View style={styles.etaContainer}>
            <Text style={styles.etaLabel}>Estimated Time</Text>
            <Text style={styles.etaValue}>{eta} min</Text>
          </View>
        )}

        {/* Route Info */}
        <View style={styles.section}>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeAddress}>{trip.pickupLocation.address}</Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Destination</Text>
            <Text style={styles.routeAddress}>{trip.destination.address}</Text>
          </View>
        </View>

        {/* Fare Info */}
        <View style={styles.fareSection}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Distance</Text>
            <Text style={styles.fareValue}>{(trip.currentDistance || 0).toFixed(1)} km</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Estimated Fare</Text>
            <Text style={styles.fareAmount}>${trip.estimatedFare.toFixed(2)}</Text>
          </View>
        </View>

        {/* Cancel Button */}
        {trip.status === 'active' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Alert.alert(
                'Cancel Trip',
                'Are you sure? You may be charged a cancellation fee.',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.patch(
                          `/trips/${tripId}/cancel`,
                          {},
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        router.back();
                      } catch (error) {
                        alert('Failed to cancel trip');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel Trip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: DARK },
  errorText: { fontSize: 18, color: DARK, marginBottom: 20 },
  mapContainer: { flex: 1, backgroundColor: '#f0f0f0' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapText: { fontSize: 18, fontWeight: '600', color: DARK },
  coordsText: { fontSize: 12, color: '#666', marginTop: 10 },
  tripCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: H * 0.5 },
  statusBadge: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: GREEN, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 15 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 },
  driverInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#f5f5f5', borderRadius: 10 },
  driverName: { fontSize: 16, fontWeight: '700', color: DARK },
  driverDetails: { fontSize: 13, color: '#666', marginTop: 2 },
  driverRating: { fontSize: 12, color: ORANGE, marginTop: 4 },
  callButton: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: ORANGE, borderRadius: 8 },
  callButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  etaContainer: { backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 15, alignItems: 'center' },
  etaLabel: { fontSize: 12, color: '#fff', opacity: 0.9 },
  etaValue: { fontSize: 24, fontWeight: '700', color: '#fff' },
  routeItem: { paddingVertical: 12 },
  routeLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  routeAddress: { fontSize: 14, fontWeight: '500', color: DARK },
  routeDivider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  fareSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fareLabel: { fontSize: 14, color: '#666' },
  fareValue: { fontSize: 14, fontWeight: '600', color: DARK },
  fareAmount: { fontSize: 16, fontWeight: '700', color: GREEN },
  button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  backButton: { backgroundColor: ORANGE },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelButton: { marginTop: 15, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', backgroundColor: '#fee2e2' },
  cancelButtonText: { color: '#dc2626', fontWeight: '600', fontSize: 14 }
});
