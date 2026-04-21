import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { UserContext } from './_layout';
import api from '@/constants/apiConfig';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';

interface RideOption {
  icon: string;
  name: string;
  time: string;
  price: number;
}

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userData } = useContext(UserContext);

  const pickup = params.pickup ? JSON.parse(params.pickup as string) : null;
  const destination = params.destination ? JSON.parse(params.destination as string) : null;
  const selectedRide = params.selectedRide ? JSON.parse(params.selectedRide as string) : null;
  const routeInfo = params.routeInfo ? JSON.parse(params.routeInfo as string) : null;

  const [isBooking, setIsBooking] = useState(false);

  const calculateFare = (rideType: RideOption, distance: number): number => {
    if (distance <= 0) return rideType.price;
    
    const ratePerKm: Record<string, number> = {
      'Economy': 8,
      'XL': 10,
      'Premium': 12,
    };
    
    const rate = ratePerKm[rideType.name] || 8;
    const distanceCharge = Math.round(distance * rate);
    const totalFare = rideType.price + distanceCharge;
    
    return totalFare;
  };

  const getDistance = (): number => {
    if (!routeInfo) return 0;
    return Number((routeInfo.distance / 1000).toFixed(2));
  };

  const distance = getDistance();
  const fare = selectedRide ? calculateFare(selectedRide, distance) : 0;

  const handleConfirm = async () => {
    if (!pickup || !destination || !selectedRide || !userData) {
      Alert.alert('Error', 'Missing booking details');
      return;
    }

    setIsBooking(true);
    try {
      const bookingData = {
        userId: userData._id,
        pickup: pickup,
        destination: destination,
        rideType: selectedRide.name,
        fare: fare,
        distance: routeInfo?.distance || 0,
        duration: routeInfo?.duration || 0,
      };

      const response = await api.post('/trips', bookingData);
      if (response.data.success) {
        Alert.alert('Success', 'Ride booked successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to book ride. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (!pickup || !destination || !selectedRide) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Invalid booking details</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Confirm Your Ride</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>From:</Text>
          <Text style={styles.locationText}>{pickup.label}</Text>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>To:</Text>
          <Text style={styles.locationText}>{destination.label}</Text>
        </View>

        <View style={styles.rideRow}>
          <Text style={styles.rideIcon}>{selectedRide.icon}</Text>
          <Text style={styles.rideName}>{selectedRide.name}</Text>
          <Text style={styles.ridePrice}>M{fare}</Text>
        </View>

        {routeInfo && (
          <View style={styles.routeRow}>
            <Text style={styles.routeText}>Distance: {(routeInfo.distance / 1000).toFixed(1)} km</Text>
            <Text style={styles.routeText}>Duration: {Math.round(routeInfo.duration / 60)} min</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, isBooking && styles.disabledButton]}
        onPress={handleConfirm}
        disabled={isBooking}
      >
        {isBooking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmButtonText}>Confirm Ride</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  summary: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  locationLabel: {
    fontSize: 16,
    color: ORANGE,
    fontWeight: 'bold',
    width: 50,
  },
  locationText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#555',
  },
  rideIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  rideName: {
    fontSize: 18,
    color: '#fff',
    flex: 1,
  },
  ridePrice: {
    fontSize: 18,
    color: ORANGE,
    fontWeight: 'bold',
  },
  routeRow: {
    marginTop: 10,
  },
  routeText: {
    fontSize: 14,
    color: '#ccc',
  },
  confirmButton: {
    backgroundColor: ORANGE,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
  },
  backButton: {
    backgroundColor: ORANGE,
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
});