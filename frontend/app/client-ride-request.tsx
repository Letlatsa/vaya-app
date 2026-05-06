import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, Dimensions, ActivityIndicator, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { UserContext } from './_layout';
import { useRouter } from 'expo-router';
import api from '@/constants/apiConfig';

const { width: W, height: H } = Dimensions.get('window');
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
  const { userData, token } = useContext(UserContext);
  
  // States
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDestinationInput, setShowDestinationInput] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTrip, setActiveTrip] = useState<TripRequest | null>(null);
  const [tripStatus, setTripStatus] = useState<string>('');

  // Animations
  const slideAnim = useRef(new Animated.Value(H)).current;

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Poll for trip status
  useEffect(() => {
    if (activeTrip) {
      const interval = setInterval(checkTripStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTrip]);

  const getCurrentLocation = async () => {
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
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await api.post('/trips/reverse-geocode', { lat, lng });
      return response.data.data.address;
    } catch (error) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const searchLocation = async (query: string) => {
    if (!query || query.length < 3) return;

    try {
      const response = await api.post('/trips/geocode', { address: query });
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
      const response = await api.post('/trips/estimate', {
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
        '/trips',
        {
          pickupCoords: { lat: pickupLocation.lat, lng: pickupLocation.lng },
          destinationCoords: { lat: destination.lat, lng: destination.lng },
          paymentMethod
        },
        { headers: { Authorization: `Bearer ${token}` } }
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

  const checkTripStatus = async () => {
    if (!activeTrip) return;

    try {
      const response = await api.get(`/trips/${activeTrip._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const trip = response.data.data;
      setTripStatus(trip.status);

      if (trip.status === 'active' && trip.driver) {
        // Driver accepted, navigate to trip tracking
        router.push(`/client-trip-tracking?tripId=${trip._id}`);
      }
    } catch (error) {
      console.error('Status Check Error:', error);
    }
  };

  const cancelTrip = async () => {
    if (!activeTrip) return;

    try {
      await api.patch(
        `/trips/${activeTrip._id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActiveTrip(null);
      setTripStatus('');
      alert('Ride cancelled');
    } catch (error) {
      console.error('Cancel Error:', error);
      alert('Failed to cancel ride');
    }
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
              <Text style={styles.fareAmount}>${estimatedFare.toFixed(2)}</Text>
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
              <Text style={styles.fareAmount}>${estimatedFare.toFixed(2)}</Text>
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
  searchInputText: { fontSize: 14, color: DARK }
});
