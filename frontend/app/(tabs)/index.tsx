import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Platform, Image,
  Animated, ScrollView, Dimensions, ActivityIndicator, Modal,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { UserContext } from '../_layout';
import RideMap from '@/components/RideMap';
import api from '@/constants/apiConfig';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_COLLAPSED = 200;
const PANEL_EXPANDED  = SCREEN_H * 0.55;

const RIDES = [
  { icon: '🚗', name: 'Standard', time: '3 min', price: 45 },
  { icon: '🚙', name: 'Comfort',  time: '5 min', price: 65 },
  { icon: '🚐', name: 'XL',       time: '7 min', price: 85 },
];

interface MapPoint { lat: number; lng: number; label: string }

export default function HomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const firstName = userData?.name?.split(' ')[0] || 'Rider';
  const avatarUrl = userData?.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'U')}&background=FF6B00&color=fff&size=128`;

  const [pickup, setPickup]           = useState<MapPoint | null>(null);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [pickupMode, setPickupMode]   = useState(true);
  const [panelOpen, setPanelOpen]     = useState(false);
  const [selectedRide, setSelectedRide] = useState<typeof RIDES[0]>(RIDES[0]);
  const [isBooking, setIsBooking]     = useState(false);
  const [tripId, setTripId]           = useState<string | null>(null);
  const [tripStatus, setTripStatus]   = useState<'idle'|'searching'|'accepted'>('idle');
  const [driverInfo, setDriverInfo]   = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const panelAnim = useRef(new Animated.Value(PANEL_COLLAPSED)).current;

  const togglePanel = (open: boolean) => {
    setPanelOpen(open);
    Animated.spring(panelAnim, {
      toValue: open ? PANEL_EXPANDED : PANEL_COLLAPSED,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  const handlePickup = (point: MapPoint) => {
    setPickup(point);
    setPickupMode(false);
  };

  const handleDestination = (point: MapPoint) => {
    setDestination(point);
    togglePanel(true);
  };

  const canBook = pickup && destination;

  // Start polling trip status every 3 seconds
  const startPolling = (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/trips/${id}/status`);
        if (res.data.data.status === 'active') {
          clearInterval(pollRef.current!);
          setTripStatus('accepted');
          setDriverInfo(res.data.data.driver);
        }
      } catch {}
    }, 3000);
  };

  const handleConfirmBooking = async () => {
    if (!pickup || !destination) return;
    setIsBooking(true);
    try {
      const res = await api.post('/api/trips', {
        pickupCoords:      { lat: pickup.lat,      lng: pickup.lng },
        pickupLabel:       pickup.label,
        destinationCoords: { lat: destination.lat, lng: destination.lng },
        destinationLabel:  destination.label,
        rideType:          selectedRide.name,
        price:             selectedRide.price,
      });
      const id = res.data.data._id;
      setTripId(id);
      setTripStatus('searching');
      startPolling(id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to book ride. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!tripId) return;
    try {
      await api.patch(`/api/trips/${tripId}/cancel`);
    } catch {}
    clearInterval(pollRef.current!);
    setTripStatus('idle');
    setTripId(null);
    setPickup(null);
    setDestination(null);
    setPickupMode(true);
    togglePanel(false);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <View style={styles.menuLine} />
          <View style={[styles.menuLine, { width: 14 }]} />
          <View style={styles.menuLine} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/' as any)}>
          <Text style={styles.topBarBrand}>VAYA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.avatarBtn}>
          <Image source={{ uri: avatarUrl }} style={styles.avatarSmall} />
        </TouchableOpacity>
      </View>

      {/* ── Map (fills remaining space) ── */}
      <View style={styles.mapContainer}>
        <RideMap
          onPickupSelect={handlePickup}
          onDestinationSelect={handleDestination}
          pickupMode={pickupMode}
        />

        {/* Map hint pill */}
        <View style={styles.hintPill}>
          <View style={[styles.hintDot, { backgroundColor: pickupMode ? ORANGE : DARK }]} />
          <Text style={styles.hintText}>
            {pickupMode ? 'Tap map to set pickup' : 'Tap map to set destination'}
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, pickupMode && styles.modeBtnActive]}
            onPress={() => setPickupMode(true)}
          >
            <Text style={[styles.modeBtnText, pickupMode && styles.modeBtnTextActive]}>📍 Pickup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, !pickupMode && styles.modeBtnActive]}
            onPress={() => setPickupMode(false)}
          >
            <Text style={[styles.modeBtnText, !pickupMode && styles.modeBtnTextActive]}>🏁 Destination</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Booking Panel ── */}
      <Animated.View style={[styles.panel, { height: panelAnim }]}>
        {/* Drag handle */}
        <TouchableOpacity style={styles.handleWrap} onPress={() => togglePanel(!panelOpen)} activeOpacity={0.8}>
          <View style={styles.handle} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.panelTitle}>Book a Ride</Text>

          {/* Pickup Field */}
          <TouchableOpacity
            style={[styles.locationRow, pickupMode && styles.locationRowActive]}
            onPress={() => { setPickupMode(true); togglePanel(false); }}
            activeOpacity={0.8}
          >
            <View style={[styles.locationDot, { backgroundColor: ORANGE }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={[styles.locationValue, !pickup && styles.locationPlaceholder]}>
                {pickup ? pickup.label : 'Tap map to select pickup point'}
              </Text>
            </View>
            {pickup && <Text style={styles.locationCheck}>✓</Text>}
          </TouchableOpacity>

          <View style={styles.locationConnector} />

          {/* Destination Field */}
          <TouchableOpacity
            style={[styles.locationRow, !pickupMode && styles.locationRowActive]}
            onPress={() => { setPickupMode(false); togglePanel(false); }}
            activeOpacity={0.8}
          >
            <View style={[styles.locationDot, { backgroundColor: DARK }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={[styles.locationValue, !destination && styles.locationPlaceholder]}>
                {destination ? destination.label : 'Tap map to select destination'}
              </Text>
            </View>
            {destination && <Text style={styles.locationCheck}>✓</Text>}
          </TouchableOpacity>

          {/* Ride Options */}
          {canBook && (
            <View style={styles.rideOptions}>
              <Text style={styles.rideOptionsTitle}>Choose Ride Type</Text>
              {RIDES.map((ride) => (
                <TouchableOpacity
                  key={ride.name}
                  style={[styles.rideCard, selectedRide.name === ride.name && styles.rideCardSelected]}
                  onPress={() => setSelectedRide(ride)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rideIcon}>{ride.icon}</Text>
                  <View style={styles.rideInfo}>
                    <Text style={styles.rideName}>{ride.name}</Text>
                    <Text style={styles.rideTime}>{ride.time} away</Text>
                  </View>
                  <Text style={styles.ridePrice}>M {ride.price}</Text>
                  {selectedRide.name === ride.name && <Text style={styles.rideCheck}> ✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Book Button */}
          <TouchableOpacity
            style={[styles.bookBtn, !canBook && styles.bookBtnDisabled]}
            disabled={!canBook || isBooking}
            onPress={handleConfirmBooking}
            activeOpacity={0.85}
          >
            {isBooking
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.bookBtnText}>{canBook ? '🚖  Confirm Booking' : 'Select pickup & destination'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* ── Searching for driver modal ── */}
      <Modal visible={tripStatus === 'searching'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ActivityIndicator size="large" color={ORANGE} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Finding your driver...</Text>
            <Text style={styles.modalSub}>Hang tight, a driver will accept your ride shortly</Text>
            <View style={styles.modalTrip}>
              <View style={styles.modalTripRow}>
                <View style={[styles.locationDot, { backgroundColor: ORANGE }]} />
                <Text style={styles.modalTripText} numberOfLines={1}>{pickup?.label}</Text>
              </View>
              <View style={styles.locationConnector} />
              <View style={styles.modalTripRow}>
                <View style={[styles.locationDot, { backgroundColor: DARK }]} />
                <Text style={styles.modalTripText} numberOfLines={1}>{destination?.label}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelTrip}>
              <Text style={styles.cancelBtnText}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Driver accepted modal ── */}
      <Modal visible={tripStatus === 'accepted'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.acceptedIcon}>🎉</Text>
            <Text style={styles.modalTitle}>Driver Found!</Text>
            <Text style={styles.modalSub}>Your driver is on the way</Text>
            {driverInfo && (
              <View style={styles.driverCard}>
                <Image
                  source={{ uri: driverInfo.profilePicture ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(driverInfo.name || 'D')}&background=1A1A2E&color=fff&size=128` }}
                  style={styles.driverAvatar}
                />
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driverInfo.name}</Text>
                  <Text style={styles.driverPhone}>{driverInfo.phoneNumber}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.bookBtn} onPress={() => {
              setTripStatus('idle');
              setTripId(null);
              setPickup(null);
              setDestination(null);
              setPickupMode(true);
              togglePanel(false);
            }}>
              <Text style={styles.bookBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: ORANGE,
    zIndex: 10,
  },
  menuBtn: { gap: 5, padding: 4 },
  menuLine: { width: 22, height: 2.5, backgroundColor: '#fff', borderRadius: 2 },
  topBarBrand: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  avatarBtn: { padding: 2 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#fff' },

  // Map
  mapContainer: { flex: 1, position: 'relative' },

  hintPill: {
    position: 'absolute', top: 14, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    left: '50%', transform: [{ translateX: -110 }],
  },
  hintDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  hintText: { fontSize: 13, fontWeight: '600', color: '#333' },

  modeToggle: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'column', gap: 8,
  },
  modeBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  modeBtnActive: { borderColor: ORANGE, backgroundColor: '#fff' },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
  modeBtnTextActive: { color: ORANGE },

  // Panel
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  handleWrap: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0' },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },

  // Location rows
  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f7f8fc', borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: 'transparent',
  },
  locationRowActive: { borderColor: ORANGE, backgroundColor: '#FFF8F4' },
  locationDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 11, fontWeight: '700', color: '#999', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  locationValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  locationPlaceholder: { color: '#bbb', fontWeight: '400' },
  locationCheck: { fontSize: 16, color: '#4CAF50', fontWeight: '700' },
  locationConnector: { width: 2, height: 10, backgroundColor: '#e0e0e0', marginLeft: 19, marginVertical: 2 },

  // Ride options
  rideOptions: { marginTop: 20 },
  rideOptionsTitle: { fontSize: 14, fontWeight: '700', color: '#999', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  rideCardSelected: { borderColor: ORANGE, backgroundColor: '#FFF8F4' },
  rideCheck: { fontSize: 16, color: '#4CAF50', fontWeight: '700', marginLeft: 4 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 400, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalTrip: { width: '100%', backgroundColor: '#f7f8fc', borderRadius: 14, padding: 14, marginBottom: 20 },
  modalTripRow: { flexDirection: 'row', alignItems: 'center' },
  modalTripText: { flex: 1, fontSize: 13, color: '#333', marginLeft: 10 },
  acceptedIcon: { fontSize: 48, marginBottom: 12 },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f8fc', borderRadius: 14, padding: 14, width: '100%', marginBottom: 20 },
  driverAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  driverPhone: { fontSize: 13, color: '#888', marginTop: 2 },
  cancelBtn: { borderWidth: 1.5, borderColor: '#e53935', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 32 },
  cancelBtnText: { color: '#e53935', fontWeight: '700', fontSize: 15 },
  rideIcon: { fontSize: 28, marginRight: 14 },
  rideInfo: { flex: 1 },
  rideName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  rideTime: { fontSize: 12, color: '#999', marginTop: 2 },
  ridePrice: { fontSize: 16, fontWeight: '800', color: ORANGE },

  // Book button
  bookBtn: {
    backgroundColor: ORANGE, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  bookBtnDisabled: { backgroundColor: '#e0e0e0', shadowOpacity: 0 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
