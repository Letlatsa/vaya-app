import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { UserContext } from './_layout';
import authStorage from '@/utils/authStorage';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 480;
  const isMediumScreen = width < 768;

  // Responsive sizes
  const headerHeight = height * 0.18;
  const profileImageSize = Math.min(width * 0.2, 80);
  const cardPadding = width * 0.05;
  const cardMargin = width * 0.04;
  const headerFontSize = Math.min(width * 0.06, 28);
  const titleFontSize = Math.min(width * 0.045, 18);
  const subtitleFontSize = Math.min(width * 0.035, 14);
  const buttonFontSize = Math.min(width * 0.035, 14);

  const [loading, setLoading] = useState(false);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetchPendingTrips();
  }, []);

  const fetchPendingTrips = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/trips/pending`);
      if (response.data.success) {
        setPendingTrips(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      setPendingTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTrip = async (tripId: string) => {
    try {
      setLoading(true);
      const response = await axios.patch(`${API_URL}/trips/${tripId}/accept`);
      if (response.data.success) {
        setModalTitle('Success');
        setModalMessage('Trip accepted! You can now start driving.');
        setIsSuccess(true);
        setModalVisible(true);
        fetchPendingTrips();
      }
    } catch (error: any) {
      setModalTitle('Error');
      setModalMessage(error.response?.data?.message || 'Failed to accept trip');
      setIsSuccess(false);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await authStorage.clearToken();
            router.replace('/');
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const driverName = userData?.name || 'Driver';
  const driverEmail = userData?.email || 'N/A';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View
          style={[
            styles.headerCard,
            {
              height: headerHeight,
              paddingHorizontal: cardPadding,
              paddingVertical: cardPadding * 1.2,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileSection}>
              <View
                style={[
                  styles.profileImage,
                  { width: profileImageSize, height: profileImageSize },
                ]}
              >
                <Text style={[styles.profileInitial, { fontSize: profileImageSize * 0.4 }]}>
                  {driverName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, { fontSize: headerFontSize }]}>
                  {driverName}
                </Text>
                <Text style={[styles.driverEmail, { fontSize: subtitleFontSize }]}>
                  {driverEmail}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.settingsButton, { paddingHorizontal: cardPadding }]}
              onPress={() => router.push('/profile')}
            >
              <Text style={[styles.settingsIcon, { fontSize: titleFontSize }]}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Cards */}
        <View
          style={[
            styles.statusCardsContainer,
            {
              paddingHorizontal: cardPadding,
              marginVertical: cardMargin,
              flexDirection: isMediumScreen ? 'column' : 'row',
            },
          ]}
        >
          <View
            style={[
              styles.statusCard,
              styles.statusCardOnline,
              {
                marginRight: isMediumScreen ? 0 : cardMargin,
                marginBottom: isMediumScreen ? cardMargin : 0,
                flex: isMediumScreen ? 1 : 0.5,
              },
            ]}
          >
            <Text style={[styles.statusLabel, { fontSize: subtitleFontSize }]}>Status</Text>
            <Text style={[styles.statusValue, { fontSize: titleFontSize }]}>Online</Text>
            <Text style={[styles.statusSubtext, { fontSize: subtitleFontSize * 0.9 }]}>
              Ready to accept rides
            </Text>
          </View>

          <View
            style={[
              styles.statusCard,
              styles.statusCardTrips,
              {
                flex: isMediumScreen ? 1 : 0.5,
              },
            ]}
          >
            <Text style={[styles.statusLabel, { fontSize: subtitleFontSize }]}>Available</Text>
            <Text style={[styles.statusValue, { fontSize: titleFontSize }]}>
              {pendingTrips.length}
            </Text>
            <Text style={[styles.statusSubtext, { fontSize: subtitleFontSize * 0.9 }]}>
              {pendingTrips.length === 1 ? 'trip waiting' : 'trips waiting'}
            </Text>
          </View>
        </View>

        {/* Pending Trips Section */}
        <View style={[styles.section, { paddingHorizontal: cardPadding }]}>
          <Text style={[styles.sectionTitle, { fontSize: titleFontSize, marginBottom: cardMargin }]}>
            Available Trips
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B00" />
            </View>
          ) : pendingTrips.length === 0 ? (
            <View style={[styles.emptyContainer, { paddingVertical: height * 0.05 }]}>
              <Text style={[styles.emptyIcon, { fontSize: titleFontSize * 2 }]}>📭</Text>
              <Text style={[styles.emptyText, { fontSize: subtitleFontSize }]}>
                No trips available
              </Text>
              <Text style={[styles.emptySubtext, { fontSize: subtitleFontSize * 0.9 }]}>
                Check back soon for ride requests
              </Text>
            </View>
          ) : (
            <View style={{ gap: cardMargin }}>
              {pendingTrips.map((trip, index) => (
                <View
                  key={trip._id || index}
                  style={[
                    styles.tripCard,
                    {
                      paddingHorizontal: cardPadding,
                      paddingVertical: cardPadding * 0.8,
                    },
                  ]}
                >
                  <View style={styles.tripHeader}>
                    <View style={styles.tripTimeline}>
                      <Text style={[styles.tripIcon, { fontSize: subtitleFontSize * 1.5 }]}>
                        📍
                      </Text>
                      <View style={styles.tripLine} />
                      <Text style={[styles.tripIcon, { fontSize: subtitleFontSize * 1.5 }]}>
                        🏁
                      </Text>
                    </View>
                    <View style={styles.tripDetails}>
                      <Text
                        style={[styles.tripAddress, { fontSize: subtitleFontSize }]}
                        numberOfLines={1}
                      >
                        {trip.pickupLocation || 'Pickup Location'}
                      </Text>
                      <Text style={[styles.tripDistance, { fontSize: subtitleFontSize * 0.85 }]}>
                        {trip.distance ? `${trip.distance.toFixed(1)} km` : 'Distance N/A'}
                      </Text>
                      <Text
                        style={[styles.tripAddress, { fontSize: subtitleFontSize, marginTop: 8 }]}
                        numberOfLines={1}
                      >
                        {trip.dropoffLocation || 'Dropoff Location'}
                      </Text>
                    </View>
                    <View style={styles.tripFare}>
                      <Text style={[styles.fareAmount, { fontSize: titleFontSize }]}>
                        ${trip.estimatedFare ? trip.estimatedFare.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.tripFooter,
                      {
                        marginTop: cardMargin,
                        paddingTop: cardMargin,
                        flexDirection: isSmallScreen ? 'column' : 'row',
                      },
                    ]}
                  >
                    <Text style={[styles.passengerName, { fontSize: subtitleFontSize }]}>
                      👤 {trip.passengerId?.name || 'Passenger'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.acceptButton,
                        {
                          marginTop: isSmallScreen ? cardMargin : 0,
                          marginLeft: isSmallScreen ? 0 : cardMargin,
                          flex: isSmallScreen ? 1 : undefined,
                          paddingVertical: Math.min(height * 0.015, 12),
                        },
                      ]}
                      onPress={() => handleAcceptTrip(trip._id)}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.acceptButtonText, { fontSize: buttonFontSize }]}>
                          Accept Trip
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { paddingHorizontal: cardPadding }]}>
          <Text style={[styles.sectionTitle, { fontSize: titleFontSize, marginBottom: cardMargin }]}>
            Quick Actions
          </Text>
          <View
            style={[
              styles.actionsContainer,
              {
                flexDirection: isSmallScreen ? 'column' : 'row',
                gap: cardMargin,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonPrimary,
                { flex: isSmallScreen ? 1 : 0.5 },
              ]}
              onPress={() => router.push('/profile')}
            >
              <Text style={[styles.actionIcon, { fontSize: titleFontSize }]}>👤</Text>
              <Text style={[styles.actionButtonText, { fontSize: buttonFontSize }]}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonSecondary,
                { flex: isSmallScreen ? 1 : 0.5 },
              ]}
              onPress={handleLogout}
            >
              <Text style={[styles.actionIcon, { fontSize: titleFontSize }]}>🚪</Text>
              <Text style={[styles.actionButtonText, { fontSize: buttonFontSize }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                maxWidth: isMediumScreen ? width * 0.85 : 350,
                paddingHorizontal: cardPadding,
                paddingVertical: cardPadding * 1.5,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconContainer,
                {
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                },
                isSuccess ? styles.iconSuccess : styles.iconError,
              ]}
            >
              <Text style={[styles.modalIcon, { fontSize: 28 }]}>{isSuccess ? '✓' : '✕'}</Text>
            </View>
            <Text style={[styles.modalTitle, { fontSize: titleFontSize, marginVertical: cardMargin }]}>
              {modalTitle}
            </Text>
            <Text style={[styles.modalMessage, { fontSize: subtitleFontSize, marginBottom: cardMargin * 1.5 }]}>
              {modalMessage}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                isSuccess ? styles.modalButtonSuccess : styles.modalButtonError,
                { paddingVertical: Math.min(height * 0.015, 12) },
              ]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { fontSize: buttonFontSize }]}>
                {isSuccess ? 'OK' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInitial: {
    color: '#fff',
    fontWeight: 'bold',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  driverEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  settingsButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsIcon: {
    color: '#fff',
  },
  statusCardsContainer: {
    justifyContent: 'space-between',
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  statusCardOnline: {
    backgroundColor: '#4CAF50',
  },
  statusCardTrips: {
    backgroundColor: '#2196F3',
  },
  statusLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  statusValue: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#333',
    fontWeight: 'bold',
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#999',
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripTimeline: {
    alignItems: 'center',
    marginRight: 12,
  },
  tripIcon: {
    color: '#FF6B00',
  },
  tripLine: {
    width: 2,
    height: 40,
    backgroundColor: '#ddd',
    marginVertical: 4,
  },
  tripDetails: {
    flex: 1,
  },
  tripAddress: {
    color: '#333',
    fontWeight: '500',
  },
  tripDistance: {
    color: '#999',
    marginTop: 2,
  },
  tripFare: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  tripFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  passengerName: {
    color: '#666',
  },
  acceptButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionsContainer: {
    justifyContent: 'space-between',
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonPrimary: {
    backgroundColor: '#FF6B00',
  },
  actionButtonSecondary: {
    backgroundColor: '#f44336',
  },
  actionIcon: {
    color: '#fff',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
  },
  modalIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconSuccess: {
    backgroundColor: '#4CAF50',
  },
  iconError: {
    backgroundColor: '#f44336',
  },
  modalIcon: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modalMessage: {
    color: '#666',
    textAlign: 'center',
  },
  modalButton: {
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalButtonSuccess: {
    backgroundColor: '#FF6B00',
  },
  modalButtonError: {
    backgroundColor: '#f44336',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
