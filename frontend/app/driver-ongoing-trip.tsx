import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, Dimensions, ActivityIndicator, Alert, Platform,
  SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { UserContext } from './_layout';
import api from '@/constants/apiConfig';
import { io } from 'socket.io-client';
import { authStorage } from '@/utils/authStorage';
import RideMap from '@/components/RideMap.native';

const { width: W, height: H } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';
const LIGHT_GRAY = '#F5F5F5';

interface Trip {
  _id: string;
  driver: any;
  passenger: any;
  pickupLocation: { coordinates: [number, number]; address: string };
  destination: { coordinates: [number, number]; address: string };
  status: string;
  estimatedFare: number;
  actualDistance?: number;
  actualDuration?: number;
  billing?: any;
}

export default function DriverOngoingTrip() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();
  const { userData } = useContext(UserContext);
  
  // States
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [tripStatus, setTripStatus] = useState('');
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  const [socket, setSocket] = useState<any>(null);
  
  // Location tracking
  const locationSubscription = useRef<any>(null);
  const updateIntervalRef = useRef<any>(null);

  // Load trip data
  useEffect(() => {
    loadTrip();
  }, [tripId]);

  // Initialize socket connection
  useEffect(() => {
    initializeSocket();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Start location tracking once trip loads
  useEffect(() => {
    if (trip && trip.status === 'active') {
      startLocationTracking();
    }
  }, [trip]);

  const loadTrip = async () => {
    try {
      const response = await api.get(`/api/trips/${tripId}`);
      const tripData = response.data.data;
      setTrip(tripData);
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
      console.log('Driver socket connected');
      socketConnection.emit('trip:join', { tripId });
    });

    socketConnection.on('trip:status:changed', (data) => {
      console.log('Trip status changed:', data);
      setTripStatus(data.status);
      setTrip(prev => prev ? { ...prev, status: data.status } : null);
    });

    socketConnection.on('passenger:location:updated', (data) => {
      // Handle passenger location updates if needed
      console.log('Passenger location:', data);
    });

    socketConnection.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketConnection);
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for the trip');
        return;
      }

      // Watch location updates
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          setDriverLocation({ lat: latitude, lng: longitude });

          // Send to socket
          if (socket && trip) {
            socket.emit('location:update', {
              tripId: trip._id,
              location: {
                lat: latitude,
                lng: longitude,
                accuracy: location.coords.accuracy
              }
            });
          }
        }
      );

      // Poll trip status periodically
      updateIntervalRef.current = setInterval(() => {
        pollTripStatus();
      }, 5000);
    } catch (error) {
      console.error('Location Tracking Error:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const pollTripStatus = async () => {
    try {
      const response = await api.get(`/api/trips/${tripId}`);

      const tripData = response.data.data;
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const handleMarkArrived = async () => {
    setConfirmAction('arrived');
    setShowConfirmModal(true);
  };

  const handleStartTrip = async () => {
    setConfirmAction('start');
    setShowConfirmModal(true);
  };

  const handleCompleteTrip = async () => {
    setConfirmAction('complete');
    setShowConfirmModal(true);
  };

  const confirmAction_Arrived = async () => {
    try {
      setShowConfirmModal(false);
      setLoading(true);

      const response = await api.put(`/api/trips/${tripId}/arrived`, {});

      setTrip(response.data.data);
      setTripStatus('arrived');

      // Notify passenger
      if (socket) {
        socket.emit('trip:arrived', { tripId });
      }

      Alert.alert('Success', 'Passenger notified that you have arrived');
    } catch (error: any) {
      console.error('Arrived Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to mark arrival');
    } finally {
      setLoading(false);
    }
  };

  const confirmAction_StartTrip = async () => {
    try {
      setShowConfirmModal(false);
      setLoading(true);

      const response = await api.put(`/api/trips/${tripId}/start`, {});

      setTrip(response.data.data);
      setTripStatus('in_progress');

      if (socket) {
        socket.emit('trip:started', { tripId });
      }

      Alert.alert('Success', 'Trip has started');
    } catch (error: any) {
      console.error('Start Trip Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const confirmAction_CompleteTrip = async () => {
    try {
      setShowConfirmModal(false);
      setLoading(true);

      // Calculate actual distance and duration
      const actualDistance = distance || 0;
      const actualDuration = duration || 0;

      const response = await api.put(`/api/trips/${tripId}/complete`, {
        actualDistance,
        actualDuration,
        waypoints: [] // Would need to track actual waypoints from location updates
      });

      setTrip(response.data.data);
      setTripStatus('completed');

      if (socket) {
        socket.emit('trip:completed', { tripId });
      }

      Alert.alert('Success', 'Trip completed! Passenger will now proceed to payment.');
      router.push(`/driver-earnings?tripId=${tripId}`);
    } catch (error: any) {
      console.error('Complete Trip Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete trip');
    } finally {
      setLoading(false);
    }
  };

  const executeConfirmedAction = () => {
    switch (confirmAction) {
      case 'arrived':
        confirmAction_Arrived();
        break;
      case 'start':
        confirmAction_StartTrip();
        break;
      case 'complete':
        confirmAction_CompleteTrip();
        break;
    }
  };

  if (loading && !trip) {
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
    label: trip.pickupLocation.address || 'Pickup',
  };

  const destinationCoords = {
    lat: trip.destination.coordinates[1],
    lng: trip.destination.coordinates[0],
    label: trip.destination?.address || 'Destination',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <RideMap
          pickupMode={false}
          pickup={pickupCoords}
          destination={destinationCoords}
          onPickupSelect={() => {}}
          onDestinationSelect={() => {}}
          onRouteInfoChange={() => {}}
        />
      </View>

      {/* Trip Details Card */}
      <View style={styles.detailsCard}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {tripStatus.charAt(0).toUpperCase() + tripStatus.slice(1).replace('_', ' ')}
          </Text>
        </View>

        <Text style={styles.passengerName}>{trip.passenger?.fullName || trip.passenger?.name || 'Passenger'}</Text>
        <Text style={styles.passengerPhone}>{trip.passenger?.phoneNumber}</Text>

        <View style={styles.locationRow}>
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>PICKUP</Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {trip.pickupLocation.address}
            </Text>
          </View>
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>DESTINATION</Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {trip.destination.address}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {tripStatus === 'active' && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleMarkArrived}
              disabled={loading}
            >
              <Text style={styles.buttonText}>I've Arrived</Text>
            </TouchableOpacity>
          )}

          {tripStatus === 'arrived' && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleStartTrip}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Start Trip</Text>
            </TouchableOpacity>
          )}

          {tripStatus === 'in_progress' && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleCompleteTrip}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Complete Trip</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Action</Text>
            <Text style={styles.modalMessage}>
              {confirmAction === 'arrived' && 'Are you sure you have arrived at the pickup location?'}
              {confirmAction === 'start' && 'Have you picked up the passenger? Start the trip?'}
              {confirmAction === 'complete' && 'Are you sure the trip is complete?'}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={executeConfirmedAction}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
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
    backgroundColor: LIGHT_GRAY
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
  detailsCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '40%'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  passengerName: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
    marginBottom: 4
  },
  passengerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  locationItem: {
    flex: 1,
    marginRight: 12
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    marginBottom: 4
  },
  locationAddress: {
    fontSize: 14,
    color: DARK,
    fontWeight: '500'
  },
  actionButtons: {
    gap: 10
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButton: {
    backgroundColor: ORANGE
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: ORANGE
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButtonText: {
    color: ORANGE,
    fontSize: 16,
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
    padding: 20,
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
  cancelButton: {
    backgroundColor: LIGHT_GRAY
  },
  cancelButtonText: {
    color: DARK,
    fontWeight: '600'
  },
  confirmButton: {
    backgroundColor: ORANGE
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600'
  }
});
