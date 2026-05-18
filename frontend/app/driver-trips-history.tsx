import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, SafeAreaView, Dimensions,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { UserContext } from './_layout';
import api from '@/constants/apiConfig';

const { width: W } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';
const LIGHT_GRAY = '#F5F5F5';

interface Trip {
  _id: string;
  passenger: { fullName: string; profilePicture?: string };
  pickupLocation: { address: string };
  destination: { address: string };
  status: string;
  createdAt: string;
  completedAt?: string;
  billing?: {
    totalCost: number;
  };
  rideType: string;
  actualDistance?: number;
}

export default function DriverTripsHistory() {
  const router = useRouter();
  const { token } = useContext(UserContext);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    completedTrips: 0,
    totalEarnings: 0,
    averageRating: 0
  });

  useEffect(() => {
    loadTripsHistory();
  }, []);

  const loadTripsHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/trips/my-trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const tripsData = response.data.data || [];
      
      // Filter only driver's trips where they are the driver
      const driverTrips = tripsData.filter((trip: any) => 
        trip.status === 'completed' && trip.billing
      );

      setTrips(driverTrips);

      // Calculate stats
      const completed = driverTrips.length;
      const totalEarnings = driverTrips.reduce((sum: number, trip: any) => 
        sum + (trip.billing?.totalCost || 0), 0
      );

      setStats({
        completedTrips: completed,
        totalEarnings,
        averageRating: 4.8 // This would come from actual ratings
      });
    } catch (error) {
      console.error('Load Trips Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTripsHistory();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return GREEN;
      case 'cancelled':
        return '#EF4444';
      default:
        return '#999';
    }
  };

  const renderTripCard = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => router.push(`/driver-earnings?tripId=${item._id}`)}
    >
      <View style={styles.tripCardHeader}>
        <View style={styles.dateTimeSection}>
          <Text style={styles.tripDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.rideType}>{item.rideType}</Text>
        </View>
        <View style={styles.earningsSection}>
          <Text style={styles.earnings}>LSL {item.billing?.totalCost.toFixed(2)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tripCardBody}>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationAddress} numberOfLines={1}>
            {item.pickupLocation.address}
          </Text>
        </View>

        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>🏁</Text>
          <Text style={styles.locationAddress} numberOfLines={1}>
            {item.destination.address}
          </Text>
        </View>

        <View style={styles.tripMeta}>
          <Text style={styles.metaText}>
            Distance: {(item.actualDistance || 0).toFixed(1)} km
          </Text>
          <Text style={styles.metaText}>
            {item.passenger.fullName}
          </Text>
        </View>
      </View>

      <View style={styles.tripCardFooter}>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && trips.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completedTrips}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>LSL {stats.totalEarnings.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>⭐ {stats.averageRating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Trips List */}
      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No completed trips yet</Text>
          <Text style={styles.emptySubtext}>
            Start accepting rides to build your history
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTripCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  backButton: {
    fontSize: 14,
    fontWeight: '600',
    color: ORANGE
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: ORANGE,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500'
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  dateTimeSection: {
    flex: 1
  },
  tripDate: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4
  },
  rideType: {
    fontSize: 11,
    color: ORANGE,
    fontWeight: '600'
  },
  earningsSection: {
    alignItems: 'flex-end'
  },
  earnings: {
    fontSize: 16,
    fontWeight: '700',
    color: GREEN,
    marginBottom: 4
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600'
  },
  tripCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2
  },
  locationAddress: {
    flex: 1,
    fontSize: 12,
    color: DARK,
    fontWeight: '500'
  },
  tripMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE'
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500'
  },
  tripCardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE'
  },
  viewButton: {
    paddingVertical: 8
  },
  viewButtonText: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center'
  }
});
