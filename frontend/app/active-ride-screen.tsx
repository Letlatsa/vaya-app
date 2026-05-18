import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Platform, Alert
} from 'react-native';
import ActiveRideMap from '../components/ActiveRideMap';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserContext } from './_layout';
import api from '@/constants/apiConfig';
import { io } from 'socket.io-client';
import authStorageClient from '@/utils/authStorage';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';

interface Driver {
  fullName: string;
  name: string;
  rating: number;
  phoneNumber: string;
  profilePicture: string | null;
  carModel: string;
  registrationNumber: string;
  currentLocation: { lat: number; lng: number };
}

interface Trip {
  _id: string;
  passenger: { name: string; phone: string };
  driver?: Driver;
  pickupLocation: { coordinates: [number, number]; address: string };
  destination: { coordinates: [number, number]; address: string };
  status: string;
  estimatedTime: number;
  currentDistance: number;
  estimatedFare: number;
  distanceCovered: number;
  startedAt?: Date;
}

function decodePolyline(encoded: string) {
  let index = 0, lat = 0, lng = 0;
  const coordinates: { latitude: number; longitude: number }[] = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }
  return coordinates;
}

export default function ActiveRideScreen() {
  const router = useRouter();
  const { tripId, driverName, driverRating, carModel, carPlate, driverLat, driverLng } = useLocalSearchParams();
  const { userData } = useContext(UserContext);
  const [token, setToken] = useState<string | null>(null);
  
  const driverLocationFromParams = driverLat && driverLng ? { 
    lat: parseFloat(driverLat as string), 
    lng: parseFloat(driverLng as string) 
  } : null;
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(driverLocationFromParams);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const socketRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const tripRef = useRef<Trip | null>(null);
  const [bottomSheetIndex, setBottomSheetIndex] = useState(0);

  // Bottom sheet snap points
  const snapPoints = ['15%', '50%'];

  // Token, trip loader, routing and socket helpers must be declared before useEffects
  const getToken = useCallback(async () => {
    const storedToken = await authStorageClient.getToken();
    setToken(storedToken);
  }, []);

  const loadTrip = useCallback(async () => {
    try {
      const storedToken = await authStorageClient.getToken();
      const response = await api.get(`/api/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      setTrip(response.data.data);
    } catch (error) {
      console.error('Load Trip Error:', error);
      alert('Failed to load trip');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const fetchRoute = useCallback(async (driverLat: number, driverLng: number, pickupLat: number, pickupLng: number) => {
    try {
      const response = await api.post('/api/trips/route', {
        originCoords: { lat: driverLat, lng: driverLng },
        destinationCoords: { lat: pickupLat, lng: pickupLng }
      });
      const polyline = response.data.data.polyline;
      const coords = decodePolyline(polyline);
      setRouteCoords(coords);
    } catch (error) {
      console.error('Fetch Route Error:', error);
    }
  }, []);

  const connectSocket = useCallback(() => {
    socketRef.current = io(Platform.OS === 'web' ? 'http://localhost:5000' : 'http://10.0.2.2:5000', {
      auth: { token },
      reconnection: true
    });

    socketRef.current.on('driver:location', (data: { lat: number; lng: number }) => {
      setDriverLocation(data);
      const activeTrip = tripRef.current;
      if (activeTrip) {
        fetchRoute(data.lat, data.lng, activeTrip.pickupLocation.coordinates[1], activeTrip.pickupLocation.coordinates[0]);
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
  }, [token, fetchRoute, router, tripId]);

  useEffect(() => {
    getToken();
    loadTrip();
  }, [tripId, userData._id, getToken, loadTrip]);

  useEffect(() => {
    if (!token) {
      return;
    }

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, connectSocket]);

  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);

  useEffect(() => {
    if (driverLocation && trip) {
      fetchRoute(driverLocation.lat, driverLocation.lng, trip.pickupLocation.coordinates[1], trip.pickupLocation.coordinates[0]);
    }
  }, [driverLocation, trip, fetchRoute]);


  const renderBottomSheetContent = useCallback(() => {
    if (bottomSheetIndex === 0) {
      // Minimized state
      return (
        <View style={styles.minimizedContent}>
          <View style={styles.banner}>
            <Text style={styles.bannerText}>🚗 Driver is almost here</Text>
          </View>
          <View style={styles.carInfo}>
            <Text style={styles.carModel}>{carModel || trip?.driver?.carModel || 'Honda Fit'}</Text>
            <Text style={styles.carDetails}>White • {carPlate || trip?.driver?.registrationNumber || 'ABC-123'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => bottomSheetRef.current?.expand()}
          >
            <Text style={styles.expandIcon}>▲</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      // Expanded state
      return (
        <View style={styles.expandedContent}>
          {/* Driver Profile */}
          <View style={styles.driverProfile}>
            <View style={styles.driverImageContainer}>
              <Text style={styles.driverImagePlaceholder}>👤</Text>
            </View>
            <View style={styles.driverInfoExpanded}>
              <Text style={styles.driverNameExpanded}>{driverName || trip?.driver?.fullName || 'Driver Name'}</Text>
              <Text style={styles.driverRatingExpanded}>⭐ {driverRating || trip?.driver?.rating || '5.0'}</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Options */}
          <View style={styles.menuOptions}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>🎫</Text>
              <Text style={styles.menuText}>Add coupon</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>📤</Text>
              <Text style={styles.menuText}>Share order status</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>📋</Text>
              <Text style={styles.menuText}>Order details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, styles.cancelMenuItem]}
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
                            `/api/trips/${tripId}/cancel`,
                            {},
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          router.back();
                        } catch (err) {
                          console.error(err);
                          alert('Failed to cancel trip');
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.menuIcon}>❌</Text>
              <Text style={styles.cancelMenuText}>Cancel order</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }, [bottomSheetIndex, carModel, carPlate, driverName, driverRating, trip, tripId, token, router]);

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
      {/* Full Screen Map */}
      <View style={styles.mapContainer}>
        <ActiveRideMap
          driverLocation={driverLocation}
          pickupLocation={{
            lat: trip.pickupLocation.coordinates[1],
            lng: trip.pickupLocation.coordinates[0],
            address: trip.pickupLocation.address,
          }}
          routeCoords={routeCoords}
        />
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose={false}
        backgroundStyle={styles.bottomSheetBackground}
        onChange={setBottomSheetIndex}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          {renderBottomSheetContent()}
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: DARK },
  errorText: { fontSize: 18, color: DARK, marginBottom: 20 },
  mapContainer: { flex: 1, backgroundColor: '#f0f0f0' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapText: { fontSize: 18, fontWeight: '600', color: DARK },
  coordsText: { fontSize: 12, color: '#666', marginTop: 10 },
  carMarker: { 
    backgroundColor: ORANGE, 
    borderRadius: 20, 
    padding: 5,
    borderWidth: 2,
    borderColor: '#fff'
  },
  carIcon: { fontSize: 20 },
  bottomSheetBackground: { backgroundColor: '#fff' },
  bottomSheetContent: { flex: 1, padding: 20 },
  minimizedContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  banner: { flex: 1 },
  bannerText: { fontSize: 16, fontWeight: '600', color: DARK },
  carInfo: { flex: 1, alignItems: 'center' },
  carModel: { fontSize: 14, fontWeight: '600', color: DARK },
  carDetails: { fontSize: 12, color: '#666' },
  expandButton: { padding: 10 },
  expandIcon: { fontSize: 18, color: ORANGE },
  expandedContent: { flex: 1 },
  driverProfile: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  driverImageContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  driverImagePlaceholder: { fontSize: 24 },
  driverInfoExpanded: { flex: 1 },
  driverNameExpanded: { fontSize: 18, fontWeight: '600', color: DARK },
  driverRatingExpanded: { fontSize: 14, color: ORANGE, marginTop: 2 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  actionButton: { alignItems: 'center', padding: 15, backgroundColor: '#f5f5f5', borderRadius: 10, flex: 1, marginHorizontal: 5 },
  actionIcon: { fontSize: 20, marginBottom: 5 },
  actionText: { fontSize: 12, fontWeight: '600', color: DARK },
  menuOptions: { },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuIcon: { fontSize: 18, marginRight: 15, width: 30, textAlign: 'center' },
  menuText: { fontSize: 16, color: DARK },
  cancelMenuItem: { borderBottomWidth: 0 },
  cancelMenuText: { fontSize: 16, color: '#dc2626' },
  button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  backButton: { backgroundColor: ORANGE },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});