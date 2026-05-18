import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert, ScrollView, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { UserContext } from './_layout';
import api from '@/constants/apiConfig';
import authStorage from '@/utils/authStorage';

const { width: W } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';
const LIGHT_GRAY = '#F5F5F5';

interface Trip {
  _id: string;
  passenger: any;
  rideType: string;
  pickupLocation: { address: string };
  destination: { address: string };
  actualDistance?: number;
  actualDuration?: number;
  estimatedFare: number;
  billing?: {
    baseFare: number;
    perKmRate: number;
    totalDistance: number;
    totalCost: number;
  };
  status: string;
  startedAt?: string;
  completedAt?: string;
}

export default function DriverEarningsScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();
  const { userData } = useContext(UserContext);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTripDetails();
  }, [tripId]);

  const loadTripDetails = async () => {
    try {
      const response = await api.get(`/api/trips/${tripId}`);
      setTrip(response.data.data);
    } catch (error) {
      console.error('Load Trip Error:', error);
      Alert.alert('Error', 'Failed to load trip details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBackHome = () => {
    router.push('/driver-dashboard');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading earnings...</Text>
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

  const billing = trip.billing || {
    baseFare: 50,
    perKmRate: 10,
    totalDistance: trip.actualDistance || 0,
    totalCost: trip.estimatedFare || 0
  };

  const formattedDuration = trip.actualDuration 
    ? `${Math.floor((trip.actualDuration || 0) / 60)}m`
    : '~15m';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trip Completed! 🎉</Text>
          <Text style={styles.headerSubtitle}>Your earnings have been calculated</Text>
        </View>

        {/* Earnings Summary Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsAmount}>
            LSL {billing.totalCost.toFixed(2)}
          </Text>
          <Text style={styles.rideType}>{trip.rideType} Ride</Text>
        </View>

        {/* Trip Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Passenger</Text>
            <Text style={styles.detailValue}>{trip.passenger?.fullName || trip.passenger?.name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Distance</Text>
            <Text style={styles.detailValue}>{(trip.actualDistance || 0).toFixed(1)} km</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{formattedDuration}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From</Text>
            <Text style={styles.detailValue} numberOfLines={2}>{trip.pickupLocation.address}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To</Text>
            <Text style={styles.detailValue} numberOfLines={2}>{trip.destination.address}</Text>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fare Breakdown</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base Fare</Text>
            <Text style={styles.breakdownValue}>LSL {billing.baseFare.toFixed(2)}</Text>
          </View>

          {(trip.actualDistance || 0) > 5 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Additional Distance ({((trip.actualDistance || 0) - 5).toFixed(1)} km × LSL {billing.perKmRate})
              </Text>
              <Text style={styles.breakdownValue}>
                LSL {(((trip.actualDistance || 0) - 5) * billing.perKmRate).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.breakdownDivider} />

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { fontWeight: '700' }]}>Total Earnings</Text>
            <Text style={[styles.breakdownValue, { fontWeight: '700', color: GREEN }]}>
              LSL {billing.totalCost.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleBackHome}
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_GRAY
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: DARK,
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666'
  },
  earningsCard: {
    margin: 20,
    padding: 24,
    backgroundColor: GREEN,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500'
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
    marginVertical: 8
  },
  rideType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500'
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 0.4
  },
  detailValue: {
    fontSize: 14,
    color: DARK,
    fontWeight: '600',
    flex: 0.6,
    textAlign: 'right'
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  breakdownValue: {
    fontSize: 14,
    color: DARK,
    fontWeight: '600'
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 12
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 8
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButton: {
    backgroundColor: ORANGE
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});
