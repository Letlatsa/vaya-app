import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { UserContext } from '../_layout';
import api from '@/constants/apiConfig';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';

type Trip = {
  _id: string;
  pickupLocation: { address: string };
  destination: { address: string };
  rideType: string;
  price: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  driver?: { name: string; phoneNumber: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  active: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
};

const STATUS_ICONS: Record<string, string> = {
  pending: '⏳',
  active: '🚗',
  completed: '✅',
  cancelled: '❌',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyRidesScreen() {
  const navigation = useNavigation();
  const { userData, isLoggedIn } = useContext(UserContext);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!isLoggedIn) { setLoading(false); return; }
    try {
      setError(null);
      const res = await api.get('/api/trips/my-rides');
      setTrips(res.data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const onRefresh = () => { setRefreshing(true); fetchTrips(); };

  const stats = {
    total: trips.length,
    completed: trips.filter(t => t.status === 'completed').length,
    spent: trips.filter(t => t.status === 'completed').reduce((s, t) => s + t.price, 0),
  };

  const renderTrip = ({ item }: { item: Trip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={styles.statusIcon}>{STATUS_ICONS[item.status]}</Text>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.tripDate}>{formatDate(item.createdAt)}</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: ORANGE }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickupLocation.address || 'Pickup'}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: DARK }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.destination.address || 'Destination'}</Text>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.tripMeta}>
          <Text style={styles.rideType}>{item.rideType}</Text>
          {item.driver && <Text style={styles.driverName}>👤 {item.driver.name}</Text>}
        </View>
        <Text style={styles.tripPrice}>M {item.price}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <View style={styles.menuLine} />
          <View style={[styles.menuLine, { width: 14 }]} />
          <View style={styles.menuLine} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Rides</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats Bar */}
      {isLoggedIn && !loading && trips.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>M {stats.spent}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {!isLoggedIn ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>Sign in to view rides</Text>
          <Text style={styles.emptySubtitle}>Your ride history will appear here</Text>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading your rides...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTrips}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>No rides yet</Text>
          <Text style={styles.emptySubtitle}>Book your first ride from the home screen</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item._id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: ORANGE,
  },
  menuBtn: { gap: 5, padding: 4 },
  menuLine: { width: 22, height: 2.5, backgroundColor: '#fff', borderRadius: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  statsBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 16, borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: DARK },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#eee' },

  list: { padding: 16, paddingTop: 12 },

  tripCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  statusIcon: { fontSize: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  tripDate: { fontSize: 12, color: '#999' },

  routeContainer: { marginBottom: 14 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeText: { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },
  routeLine: { width: 2, height: 10, backgroundColor: '#e0e0e0', marginLeft: 4, marginVertical: 2 },

  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  tripMeta: { gap: 2 },
  rideType: { fontSize: 12, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  driverName: { fontSize: 12, color: '#999' },
  tripPrice: { fontSize: 18, fontWeight: '800', color: ORANGE },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999' },
  retryBtn: { marginTop: 20, backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
