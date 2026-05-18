import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Platform, Alert, Image,
  ScrollView, useWindowDimensions, Modal, Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ActiveRideMap from '../components/ActiveRideMap/index';
import api from '@/constants/apiConfig';
import { io } from 'socket.io-client';
import { authStorage } from '@/utils/authStorage';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=Driver&background=FF6B00&color=fff&size=128';

// Normalize trip data to ensure numeric fields have safe defaults
const normalizeTripData = (data: any): any => ({
  ...data,
  estimatedFare: Number(data.estimatedFare) || 0,
  distanceCovered: Number(data.distanceCovered) || 0,
  currentDistance: Number(data.currentDistance) || 0,
  estimatedTime: Number(data.estimatedTime) || 0
});

interface Driver {
  _id: string;
  fullName: string;
  phoneNumber: string;
  profilePicture?: string;
  carModel?: string;
  carMake?: string;
  carColor?: string;
  registrationNumber?: string;
  rating: number;
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

export default function ClientTripTrackingEnhanced() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [tripStatus, setTripStatus] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    loadTrip();
    initializeSocket();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [tripId]);

  // Start polling for updates once trip loads
  useEffect(() => {
    if (trip && trip.status !== 'completed') {
      startPolling();
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [trip]);

  // Redirect client to payment page when trip completes
  useEffect(() => {
    if (tripStatus === 'completed') {
      const redirectTimeout = setTimeout(() => {
        router.push(`/client-payment?tripId=${tripId}`);
      }, 1500);
      return () => clearTimeout(redirectTimeout);
    }
  }, [tripStatus, tripId, router]);

  const loadTrip = async () => {
    try {
      const storedToken = await authStorage.getToken();
      const response = await api.get(`/api/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      const tripData = response.data.data;
      setTrip(normalizeTripData(tripData));
      setTripStatus(tripData.status);
    } catch (error) {
      console.error('Load Trip Error:', error);
      Alert.alert('Error', 'Failed to load trip details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = async () => {
    const storedToken = await authStorage.getToken();
    const socketConnection = io('http://localhost:5000', {
      auth: { token: storedToken },
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socketConnection.on('connect', () => {
      console.log('Client socket connected');
      socketConnection.emit('trip:join', { tripId });
    });

    // Driver location updates
    socketConnection.on('driver:location:updated', (data) => {
      if (data.tripId === tripId) {
        setDriverLocation(data.location);
      }
    });

    // Trip status updates
    socketConnection.on('trip:status:changed', (data) => {
      if (data.tripId === tripId) {
        setTripStatus(data.status);
        console.log('Trip status changed:', data.status);
      }
    });

    socketConnection.on('trip:arrived', (data) => {
      if (data.tripId === tripId) {
        Alert.alert('Driver Arrived', 'Your driver has arrived at the pickup location');
        setTripStatus('arrived');
      }
    });

    socketConnection.on('trip:started', (data) => {
      if (data.tripId === tripId) {
        setTripStatus('in_progress');
      }
    });

    socketConnection.on('trip:completed', (data) => {
      if (data.tripId === tripId) {
        setTripStatus('completed');
        // Navigate to payment after a short delay
        setTimeout(() => {
          router.push(`/client-payment?tripId=${tripId}`);
        }, 1500);
      }
    });

    socketConnection.on('ride:request:accepted', (data) => {
      if (data.tripId === tripId && data.driver) {
        setTrip((prevTrip) => prevTrip ? { ...prevTrip, driver: data.driver } : prevTrip);
      }
    });

    socketConnection.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketConnection);
  };

  const startPolling = () => {
    pollIntervalRef.current = setInterval(() => {
      pollTripStatus();
    }, 5000);
  };

  const pollTripStatus = async () => {
    try {
      const storedToken = await authStorage.getToken();
      const response = await api.get(`/api/trips/${tripId}/status`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      if (response.data.data.status !== tripStatus) {
        setTripStatus(response.data.data.status);
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const handleCancelTrip = async () => {
    if (!trip) return;

    setCancelInProgress(true);
    try {
      const storedToken = await authStorage.getToken();
      await api.patch(`/api/trips/${tripId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });

      Alert.alert('Trip Cancelled', 'Your trip has been cancelled', [
        {
          text: 'OK',
          onPress: () => {
            setShowCancelModal(false);
            router.push('/(tabs)');
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to cancel trip');
    } finally {
      setCancelInProgress(false);
    }
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
        </View>
      </SafeAreaView>
    );
  }

  const pickupCoords = {
    lat: trip.pickupLocation.coordinates[1],
    lng: trip.pickupLocation.coordinates[0],
    address: trip.pickupLocation.address
  };

  const destinationCoords = {
    lat: trip.destination.coordinates[1],
    lng: trip.destination.coordinates[0],
    address: trip.destination.address
  };

  const getStatusDisplay = () => {
    switch (tripStatus) {
      case 'pending':
        return { text: 'Finding your driver...', icon: '🔍', color: '#FFA500' };
      case 'active':
        return { text: 'Driver arriving...', icon: '🚗', color: ORANGE };
      case 'arrived':
        return { text: 'Driver arrived at pickup', icon: '✓', color: GREEN };
      case 'in_progress':
        return { text: 'Trip in progress...', icon: '🚕', color: ORANGE };
      case 'completed':
        return { text: 'Trip completed', icon: '✓', color: GREEN };
      default:
        return { text: 'Unknown status', icon: '❓', color: DARK };
    }
  };

  const statusDisplay = getStatusDisplay();
  const canCancelTrip = tripStatus === 'pending' || tripStatus === 'active' || tripStatus === 'arrived';

  return (
    <SafeAreaView style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <ActiveRideMap
          driverLocation={driverLocation}
          pickupLocation={pickupCoords}
          routeCoords={[]}
        />
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusIcon}>{statusDisplay.icon}</Text>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusText}>{statusDisplay.text}</Text>
            <Text style={styles.statusSubtext}>
              {tripStatus === 'pending' && 'Estimated arrival in 5-10 minutes'}
              {tripStatus === 'active' && 'Driver is on the way'}
              {tripStatus === 'arrived' && 'Look for your driver'}
              {tripStatus === 'in_progress' && 'Heading to destination'}
              {tripStatus === 'completed' && 'Thanks for using Vaya Cabs!'}
            </Text>
          </View>
        </View>

        {/* Driver Info - Show when driver assigned */}
        {trip.driver && (
          <>
            <View style={styles.divider} />
            <View style={styles.driverInfo}>
              <View style={styles.driverCard}>
                <Image
                  source={{ uri: trip.driver.profilePicture || DEFAULT_AVATAR }}
                  style={styles.driverImage}
                />
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{trip.driver.fullName}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.rating}>⭐ {trip.driver.rating}</Text>
                  </View>
                  <Text style={styles.plate}>{trip.driver.phoneNumber}</Text>
                </View>
                <TouchableOpacity style={styles.callButton}>
                  <Text style={styles.callIcon}>☎️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.carDetailsCard}>
                <Text style={styles.carDetailsLabel}>Car Details</Text>
                <Text style={styles.carDetailsText}>
                  {trip.driver.carMake || 'Unknown'} {trip.driver.carModel || ''}
                </Text>
                <Text style={styles.carDetailsText}>
                  Colour: {trip.driver.carColor || 'Unknown'}
                </Text>
                <Text style={styles.carDetailsText}>
                  Plate: {trip.driver.registrationNumber || 'Unknown'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Location Info */}
            <View style={styles.locationInfo}>
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationLabel}>Pickup Location</Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {trip.pickupLocation.address}
                  </Text>
                </View>
              </View>

              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>🏁</Text>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationLabel}>Destination</Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {trip.destination.address}
                  </Text>
                </View>
              </View>

              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Estimated Fare</Text>
                <Text style={styles.fareAmount}>
                  LSL {trip.estimatedFare.toFixed(2)}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Action Buttons */}
        {canCancelTrip && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCancelModal(true)}
            >
              <Text style={styles.cancelButtonText}>Cancel Trip</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Trip?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this trip? You may be charged a cancellation fee.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.keepButton]}
                onPress={() => setShowCancelModal(false)}
                disabled={cancelInProgress}
              >
                <Text style={styles.keepButtonText}>Keep Trip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={handleCancelTrip}
                disabled={cancelInProgress}
              >
                {cancelInProgress ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  mapContainer: {
    flex: 1,
    marginBottom: 0
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: DARK,
    fontWeight: '600'
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600'
  },
  statusCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 12
  },
  statusTextContainer: {
    flex: 1
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    marginBottom: 4
  },
  statusSubtext: {
    fontSize: 13,
    color: '#666'
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 12
  },
  driverInfo: {
    marginBottom: 12
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8
  },
  driverImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#EEE'
  },
  driverDetails: {
    flex: 1
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
    marginBottom: 4
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  rating: {
    fontSize: 12,
    color: '#FF9800',
    marginRight: 8,
    fontWeight: '600'
  },
  carInfo: {
    fontSize: 12,
    color: '#666'
  },
  plate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic'
  },
  carDetailsCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEE'
  },
  carDetailsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK,
    marginBottom: 6
  },
  carDetailsText: {
    fontSize: 13,
    color: '#444',
    marginBottom: 4
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center'
  },
  callIcon: {
    fontSize: 20
  },
  locationInfo: {
    marginBottom: 12
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12
  },
  locationDetails: {
    flex: 1
  },
  locationLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2
  },
  locationAddress: {
    fontSize: 13,
    color: DARK,
    fontWeight: '500'
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE'
  },
  fareLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500'
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: ORANGE
  },
  actionButtons: {
    marginTop: 12
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
    marginBottom: 12
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  keepButton: {
    backgroundColor: '#F5F5F5'
  },
  keepButtonText: {
    color: DARK,
    fontWeight: '600'
  },
  cancelModalButton: {
    backgroundColor: '#EF4444'
  }
});
