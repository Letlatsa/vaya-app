import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, Dimensions, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { UserContext } from './_layout';
import { useRouter } from 'expo-router';
import api from '@/constants/apiConfig';
import { io } from 'socket.io-client';
import authStorageClient from '@/utils/authStorage';

const { height: H } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';
const RED = '#EF4444';

interface TripRequest {
  _id: string;
  pickupLocation: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  estimatedDistance: number;
  estimatedFare: number;
  paymentMethod: string;
  status: string;
}

export default function ClientRideRequest() {
  const router = useRouter();
  const { userData } = useContext(UserContext);

  // States
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDestinationInput, setShowDestinationInput] = useState(false);
  const [activeTrip, setActiveTrip] = useState<TripRequest | null>(null);
  const [tripStatus, setTripStatus] = useState<string>('');
  const [showDriverAcceptanceModal, setShowDriverAcceptanceModal] = useState(false);
  const [acceptedDriver, setAcceptedDriver] = useState<any>(null);
  const [acceptedTripData, setAcceptedTripData] = useState<any>(null);
  const [searchText, setSearchText] = useState('');

  // Animations
  const slideAnim = useRef(new Animated.Value(H)).current;

  // Get current location on mount
  const getCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        address: await reverseGeocode(location.coords.latitude, location.coords.longitude)
      };

      setPickupLocation(coords);
    } catch (error) {
      console.error('Location Error:', error);
    }
  }, []);

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      const token = await authStorageClient.getToken();
      if (!token) return;

      const socketConnection = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      socketConnection.on('connect', () => {
        console.log('Socket connected for ride requests');
      });

      socketConnection.on('ride:request:accepted', (data) => {
        console.log('Ride accepted by driver:', data);

        // Store driver and trip data then auto-navigate to tracking
        setAcceptedDriver(data.driver);
        setAcceptedTripData(data);
        // Navigate immediately to enhanced tracking
        router.push({
          pathname: `/client-trip-tracking-enhanced`,
          params: { tripId: data.tripId || data.trip?._id }
        });
      });

      socketConnection.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      return () => {
        socketConnection.disconnect();
      };
    };

    initSocket();
  }, [router]);

  // Poll for trip status (fallback if socket fails)
  const checkTripStatus = useCallback(async () => {
    if (!activeTrip) return;

    try {
      const response = await api.get(`/api/trips/${activeTrip._id}`);
      const trip = response.data.data;
      setTripStatus(trip.status);

      if (trip.status === 'active' && trip.driver) {
        const driver = trip.driver;
        setAcceptedTripData({ tripId: trip._id, trip });
        setAcceptedDriver(driver);
        router.push({ pathname: `/client-trip-tracking-enhanced`, params: { tripId: trip._id } });
      }
    } catch (error) {
      console.error('Status Check Error:', error);
    }
  }, [activeTrip, router]);

  useEffect(() => {
    if (activeTrip) {
      const interval = setInterval(checkTripStatus, 3000);
      return () => clearInterval(interval);
    }
   }, [activeTrip, checkTripStatus]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await api.post('/api/trips/reverse-geocode', { lat, lng });
      return response.data.data.address;
    } catch (err) {
      console.error('Reverse geocode error:', err);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const searchLocation = async (query: string) => {
    if (!query || query.length < 3) return;

    try {
      const response = await api.post('/api/trips/geocode', { address: query });
      const result = response.data.data;
      return {
        lat: result.coordinates.lat,
        lng: result.coordinates.lng,
        address: result.address
      };
    } catch (error) {
      console.error('Search Error:', error);
      return null;
    }
  };

  const estimateFare = async () => {
    if (!pickupLocation || !destination) {
      alert('Please set both pickup and destination');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/trips/estimate', {
        pickupCoords: { lat: pickupLocation.lat, lng: pickupLocation.lng },
        destinationCoords: { lat: destination.lat, lng: destination.lng }
      });

      const data = response.data.data;
      setEstimatedFare(data.fare);
      setEstimatedDistance(data.distance.value);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    } catch (error) {
      console.error('Estimate Error:', error);
      alert('Failed to estimate fare');
    } finally {
      setLoading(false);
    }
  };

  const requestRide = async () => {
    if (!pickupLocation || !destination) {
      alert('Please set locations');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        '/api/trips',
        {
          pickupCoords: { lat: pickupLocation.lat, lng: pickupLocation.lng },
          destinationCoords: { lat: destination.lat, lng: destination.lng },
          paymentMethod
        }
      );

      const trip = response.data.data;
      setActiveTrip(trip);
      setTripStatus('pending');
      
      // Notify user
      alert('Ride requested! Looking for drivers...');
    } catch (error) {
      console.error('Request Error:', error);
      alert('Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  const cancelTrip = async () => {
    if (!activeTrip) return;

    try {
      await api.patch(
        `/api/trips/${activeTrip._id}/cancel`,
        {}
      );

      setActiveTrip(null);
      setTripStatus('');
      alert('Ride cancelled');
    } catch (error) {
      console.error('Cancel Error:', error);
      alert('Failed to cancel ride');
    }
  };

  const handleDriverAcceptanceConfirm = () => {
    if (!acceptedTripData || !acceptedDriver) return;

    // Navigate to enhanced client-trip-tracking with real-time updates
    router.push({
      pathname: `/client-trip-tracking-enhanced`,
      params: {
        tripId: acceptedTripData.tripId || acceptedTripData.trip?._id
      }
    });

    // Reset modal state
    setShowDriverAcceptanceModal(false);
    setAcceptedDriver(null);
    setAcceptedTripData(null);
  };

  if (activeTrip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.waitingText}>Finding a driver...</Text>
          <Text style={styles.waitingSubText}>Trip Status: {tripStatus}</Text>
          
          {estimatedFare && (
            <View style={styles.fareCard}>
              <Text style={styles.fareLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmount}>LSL {estimatedFare.toFixed(2)}</Text>
              <Text style={styles.fareDistance}>{estimatedDistance?.toFixed(1)} km</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={cancelTrip}
          >
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>

        {/* Driver Acceptance Modal */}
        <Modal
          visible={showDriverAcceptanceModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.driverAcceptanceModal}>
              <Text style={styles.driverAcceptanceTitle}>Driver Found!</Text>
              
              {acceptedDriver && (
                <>
                  <View style={styles.driverInfoContainer}>
                    <View style={styles.driverHeader}>
                      <View style={styles.driverNameSection}>
                        <Text style={styles.driverNameText}>{acceptedDriver.name}</Text>
                        <View style={styles.ratingContainer}>
                          <Text style={styles.ratingText}>⭐ {acceptedDriver.rating.toFixed(1)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.driverDetailsSection}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Car:</Text>
                        <Text style={styles.detailValue}>{acceptedDriver.carModel || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Plate:</Text>
                        <Text style={styles.detailValue}>{acceptedDriver.registrationNumber || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone:</Text>
                        <Text style={styles.detailValue}>{acceptedDriver.phoneNumber}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleDriverAcceptanceConfirm}
                  >
                    <Text style={styles.confirmButtonText}>View on Map</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Request a Ride</Text>
        </View>

        {/* Pickup Location */}
        <View style={styles.card}>
          <Text style={styles.label}>Pickup Location</Text>
          <View style={styles.locationBox}>
            <Text style={styles.locationText}>
              {pickupLocation?.address || 'Getting location...'}
            </Text>
            <TouchableOpacity onPress={getCurrentLocation}>
              <Text style={styles.link}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Destination */}
        <View style={styles.card}>
          <Text style={styles.label}>Destination</Text>
          <TouchableOpacity
            style={styles.inputBox}
            onPress={() => setShowDestinationInput(true)}
          >
            <Text style={destination ? styles.inputText : styles.placeholderText}>
              {destination?.address || 'Enter destination'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            {['CASH', 'CARD'].map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentButton,
                  paymentMethod === method && styles.paymentButtonActive
                ]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text style={[
                  styles.paymentButtonText,
                  paymentMethod === method && styles.paymentButtonTextActive
                ]}>
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Estimate & Request Buttons */}
        <TouchableOpacity
          style={[styles.button, styles.estimateButton]}
          onPress={estimateFare}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Estimate Fare</Text>
          )}
        </TouchableOpacity>

        {estimatedFare && (
          <>
            <View style={styles.fareCard}>
              <Text style={styles.fareLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmount}>LSL {estimatedFare.toFixed(2)}</Text>
              <Text style={styles.fareDistance}>{estimatedDistance?.toFixed(1)} km</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.requestButton]}
              onPress={requestRide}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Request Ride</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Destination Search Modal */}
      <Modal visible={showDestinationInput} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDestinationInput(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Destination</Text>
            <View />
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchLabel}>Where to?</Text>
            <TouchableOpacity style={styles.searchInput}>
              <Text
                onPress={async () => {
                  const result = await searchLocation(searchText);
                  if (result) {
                    setDestination(result);
                    setShowDestinationInput(false);
                  }
                }}
                style={styles.searchInputText}
              >
                {searchText || 'Search location...'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: DARK },
  card: { marginHorizontal: 20, marginBottom: 15, paddingVertical: 15, paddingHorizontal: 15, borderRadius: 12, backgroundColor: '#f5f5f5' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: DARK },
  locationBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationText: { fontSize: 13, color: '#666', flex: 1 },
  link: { color: ORANGE, fontWeight: '600', fontSize: 12 },
  inputBox: { paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  inputText: { fontSize: 14, color: DARK },
  placeholderText: { fontSize: 14, color: '#999' },
  paymentOptions: { flexDirection: 'row', gap: 10 },
  paymentButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, borderColor: '#ddd', alignItems: 'center' },
  paymentButtonActive: { borderColor: ORANGE, backgroundColor: ORANGE },
  paymentButtonText: { fontSize: 13, fontWeight: '600', color: DARK },
  paymentButtonTextActive: { color: '#fff' },
  button: { marginHorizontal: 20, marginVertical: 10, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  estimateButton: { backgroundColor: '#ddd' },
  requestButton: { backgroundColor: GREEN },
  cancelButton: { backgroundColor: RED },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fareCard: { marginHorizontal: 20, marginVertical: 15, paddingVertical: 15, paddingHorizontal: 15, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center' },
  fareLabel: { fontSize: 12, color: '#fff', opacity: 0.9, marginBottom: 5 },
  fareAmount: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 5 },
  fareDistance: { fontSize: 12, color: '#fff', opacity: 0.9 },
  waitingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  waitingText: { fontSize: 18, fontWeight: '600', marginTop: 20, color: DARK },
  waitingSubText: { fontSize: 14, color: '#666', marginTop: 10 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalClose: { fontSize: 24, color: DARK },
  modalTitle: { fontSize: 18, fontWeight: '700', color: DARK },
  searchBox: { padding: 20 },
  searchLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: DARK },
  searchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 12 },
  searchInputText: { fontSize: 14, color: DARK },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  driverAcceptanceModal: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 20, maxHeight: '80%' },
  driverAcceptanceTitle: { fontSize: 20, fontWeight: '700', color: DARK, textAlign: 'center', marginBottom: 16 },
  driverInfoContainer: { gap: 12 },
  driverHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverNameSection: { flex: 1 },
  driverNameText: { fontSize: 18, fontWeight: '600', color: DARK },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF8F4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  ratingText: { fontSize: 14, color: ORANGE, fontWeight: '600' },
  driverDetailsSection: { gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  detailValue: { fontSize: 14, color: DARK, fontWeight: '600' },
  confirmButton: { flex: 1, paddingVertical: 14, backgroundColor: ORANGE, borderRadius: 8, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 }
});
