import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, Platform, Image,
  Animated, ScrollView, Dimensions, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { UserContext } from '../_layout';
import RideMap from '@/components/RideMap';
import api from '@/constants/apiConfig';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_COLLAPSED = 200;
const PANEL_EXPANDED  = SCREEN_H * 0.55;

const RIDES = [
  { icon: '🚗', name: 'Standard', base: 50, time: '3-5 min', description: 'Affordable rides' },
  { icon: '🚙', name: 'Comfort',  base: 60, time: '5-7 min', description: 'Extra space & comfort' },
  { icon: '🚐', name: 'XL',       base: 80, time: '7-9 min', description: 'Room for everyone' },
];

interface MapPoint { lat: number; lng: number; label: string }

export default function HomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const firstName = userData?.name?.split(' ')[0] || 'Rider';
  const avatarUrl = userData?.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'U')}&background=FF6B00&color=fff&size=128`;

  const params = useLocalSearchParams();
  const SAVED_LOCATIONS: Record<string, MapPoint> = {
    home: { label: 'Home', lat: -26.2041, lng: 28.0473 },
    office: { label: 'Office', lat: -26.1220, lng: 28.0400 },
  };

   const [pickup, setPickup]           = useState<MapPoint | null>(null);
   const [destination, setDestination] = useState<MapPoint | null>(null);
   const [pickupMode, setPickupMode]   = useState(true);
   const [pickupQuery, setPickupQuery] = useState('');
   const [destinationQuery, setDestinationQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [panelOpen, setPanelOpen]     = useState(false);
  const [routeInfo, setRouteInfo]     = useState<{ distance: number; duration: number; coords: { latitude: number; longitude: number }[] } | null>(null);
  const [savedLocationApplied, setSavedLocationApplied] = useState(false);
  const [selectedRide, setSelectedRide] = useState<typeof RIDES[0]>(RIDES[0]);
   const [tripStatus, setTripStatus]   = useState<'idle'|'searching'|'accepted'>('idle');
   const [driverInfo, setDriverInfo]   = useState<any>(null);
   const [isBooking, setIsBooking]     = useState(false);
   const [errorText, setErrorText]     = useState<string | null>(null);
   const [tripId, setTripId]           = useState<string | null>(null);
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
    setPickupQuery(point.label);
    setPickupMode(false);
  };

  useEffect(() => {
    const locationParam = typeof params.location === 'string' ? params.location : undefined;
    const targetParam = typeof params.target === 'string' ? params.target : 'pickup';
    if (!locationParam || savedLocationApplied) return;

    const savedPoint = SAVED_LOCATIONS[locationParam.toLowerCase()];
    if (!savedPoint) return;

    if (targetParam === 'destination') {
      handleDestination(savedPoint);
    } else {
      handlePickup(savedPoint);
    }

    setSavedLocationApplied(true);
  }, [params, savedLocationApplied]);

  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorText('Location permission denied. Please enable location services to set pickup automatically.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const reverseRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const reverseData = await reverseRes.json();
        const label = reverseData.display_name || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        setPickup({ lat: latitude, lng: longitude, label });
        setPickupQuery(label);
        setErrorText(null);
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorText('Unable to get current location. Please enter pickup manually.');
      }
    };
    getCurrentLocation();
  }, []);

  const handleDestination = (point: MapPoint) => {
    setDestination(point);
    setDestinationQuery(point.label);
    togglePanel(true);
  };

  const chooseSuggestion = (point: { label: string; lat: number; lng: number }, isPickup: boolean) => {
    const selected: MapPoint = { label: point.label, lat: point.lat, lng: point.lng };
    if (isPickup) {
      setPickup(selected);
      setPickupQuery(selected.label);
      setPickupSuggestions([]);
      setPickupMode(false);
    } else {
      setDestination(selected);
      setDestinationQuery(selected.label);
      setDestinationSuggestions([]);
      togglePanel(true);
    }
  };

  const searchPlaces = async (query: string) => {
    if (!query.trim()) return [];
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
      const data = await res.json();
      return Array.isArray(data) ? data.map((item: any) => ({
        label: item.display_name || item.name || query,
        lat: Number(item.lat),
        lng: Number(item.lon),
      })) : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!pickupQuery.trim()) return setPickupSuggestions([]);
      const results = await searchPlaces(pickupQuery);
      setPickupSuggestions(results);
    }, 350);
    return () => clearTimeout(timer);
  }, [pickupQuery]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!destinationQuery.trim()) return setDestinationSuggestions([]);
      const results = await searchPlaces(destinationQuery);
      setDestinationSuggestions(results);
    }, 350);
    return () => clearTimeout(timer);
  }, [destinationQuery]);

  const haversineKm = (a: MapPoint, b: MapPoint) => {
    const toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const R = 6371;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getDistanceKm = () => {
    if (!pickup || !destination) return 0;
    if (routeInfo?.distance) return Number((routeInfo.distance / 1000).toFixed(2));
    return Number(haversineKm(pickup, destination).toFixed(2));
  };

  const calculateFare = (rideType: typeof RIDES[0], distance: number): number => {
    // Pricing structure: Base price for 0-5km, LSL10 per km for distance > 5km
    const PER_KM_RATE = 10;
    
    if (distance <= 5.0) {
      return rideType.base;
    } else {
      return Math.ceil(rideType.base + ((distance - 5) * PER_KM_RATE));
    }
  };

  const distanceKm = getDistanceKm();
  const estimatedMinutes = routeInfo ? Math.round(routeInfo.duration / 60) : Math.max(1, Math.round(distanceKm * 3)); // rough estimate
  const totalFare = calculateFare(selectedRide, distanceKm);
  const sameLocation = pickup && destination && distanceKm < 0.05;
  const canBook = pickup && destination && !sameLocation;

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

  const handleBookNow = async () => {
    if (!pickup || !destination) return;
    setIsBooking(true);
    try {
      const res = await api.post('/api/trips', {
        pickupCoords:      { lat: pickup.lat,      lng: pickup.lng },
        pickupLabel:       pickup.label,
        destinationCoords: { lat: destination.lat, lng: destination.lng },
        destinationLabel:  destination.label,
        rideType:          selectedRide.name,
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
          onRouteInfoChange={setRouteInfo}
          pickupMode={pickupMode}
          pickup={pickup}
          destination={destination}
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

        <View style={styles.fareBanner} accessible accessibilityLabel="Fare summary">
          <View>
            <Text style={styles.fareBannerLabel}>Distance</Text>
            <Text style={styles.fareBannerValue}>{distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : 'Set locations'}</Text>
          </View>
          <View>
            <Text style={styles.fareBannerLabel}>ETA</Text>
            <Text style={styles.fareBannerValue}>{pickup && destination ? formatDuration(estimatedMinutes) : 'N/A'}</Text>
          </View>
          <View>
            <Text style={styles.fareBannerLabel}>Fare</Text>
            <Text style={styles.fareBannerValue}>LSL {totalFare}</Text>
          </View>
        </View>
      </View>

      {/* ── Booking Panel ── */}
      <Animated.View style={[styles.panel, { height: panelAnim }]}>
        {/* Drag handle */}
        <TouchableOpacity style={styles.handleWrap} onPress={() => togglePanel(!panelOpen)} activeOpacity={0.8}>
          <View style={styles.handle} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScroll={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Text style={styles.panelTitle}>Book a Ride</Text>

          {/* Pickup Field */}
          <View style={[styles.locationRow, pickupMode && styles.locationRowActive]}>
            <View style={[styles.locationDot, { backgroundColor: ORANGE }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <TextInput
                value={pickupQuery}
                onChangeText={(text) => { setPickupQuery(text); setPickupMode(true); }}
                placeholder="Start address or place name"
                placeholderTextColor="#999"
                style={styles.locationInput}
                accessibilityLabel="Pickup address input"
                accessibilityHint="Enter your pickup location or use current location"
              />
              {pickupSuggestions.length > 0 && (
                <View style={styles.suggestionList}>
                  {pickupSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`pickup-suggestion-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => chooseSuggestion(item, true)}
                    >
                      <Text style={styles.suggestionLabel}>📍 {item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {pickup && <Text style={styles.locationCheck}>✓</Text>}
          </View>

          <View style={styles.locationConnector} />

          <View style={[styles.locationRow, !pickupMode && styles.locationRowActive]}>
            <View style={[styles.locationDot, { backgroundColor: DARK }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Destination</Text>
              <TextInput
                value={destinationQuery}
                onChangeText={(text) => { setDestinationQuery(text); setPickupMode(false); }}
                placeholder="Where to?"
                placeholderTextColor="#999"
                style={styles.locationInput}
                accessibilityLabel="Destination address input"
                accessibilityHint="Enter your destination location"
              />
              {destinationSuggestions.length > 0 && (
                <View style={styles.suggestionList}>
                  {destinationSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`dest-suggestion-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => chooseSuggestion(item, false)}
                    >
                      <Text style={styles.suggestionLabel}>🏁 {item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {destination && <Text style={styles.locationCheck}>✓</Text>}
          </View>

          <View style={styles.detailRow}>
            <View style={styles.fareSummaryCompact}>
              <Text style={styles.locationLabel}>Estimated</Text>
              <Text style={styles.fareSummaryText}>{distanceKm > 0 ? `${distanceKm.toFixed(1)} km • ${formatDuration(estimatedMinutes)}` : 'Set your route'}</Text>
            </View>
          </View>

          {errorText && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

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
                    <Text style={styles.rideDesc}>{ride.description}</Text>
                  </View>
                  <View style={styles.ridePriceBlock}>
                    <Text style={styles.ridePrice}>LSL {calculateFare(ride, distanceKm)}</Text>
                    <Text style={styles.rideEta}>{ride.time}</Text>
                  </View>
                  {selectedRide.name === ride.name && <Text style={styles.rideCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Book Button */}
           <TouchableOpacity
             style={[styles.bookBtn, !canBook && styles.bookBtnDisabled]}
             disabled={!canBook || isBooking}
             onPress={handleBookNow}
             activeOpacity={0.85}
           >
            {isBooking
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.bookBtnText}>{canBook ? '🚖  Request Ride' : 'Select pickup & destination'}</Text>
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
  locationInput: {
    fontSize: 14, color: '#1a1a1a', paddingVertical: Platform.OS === 'web' ? 10 : 8,
    paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e0e0e0', marginTop: 6,
  },
  suggestionList: {
    marginTop: 8, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#ececec', overflow: 'hidden', zIndex: 10,
  },
  suggestionItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionLabel: { color: '#333', fontSize: 13 },
  locationCheck: { fontSize: 16, color: '#4CAF50', fontWeight: '700' },
  locationConnector: { width: 2, height: 12, backgroundColor: '#ddd', marginLeft: 5, marginVertical: 4 },
  fareBanner: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 6,
  },
  fareBannerLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase', marginBottom: 4 },
  fareBannerValue: { fontSize: 15, color: '#1a1a1a', fontWeight: '800' },
  detailRow: { marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  travelTabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  modeChip: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#e0e0e0', minWidth: 80, alignItems: 'center',
  },
  modeChipActive: { backgroundColor: '#FFF8F4', borderColor: ORANGE },
  modeChipText: { fontSize: 12, color: '#666', fontWeight: '700' },
  modeChipTextActive: { color: ORANGE },
  fareSummaryCompact: { alignItems: 'flex-end', maxWidth: 160 },
  fareSummaryText: { fontSize: 13, color: '#333', fontWeight: '700', marginTop: 4 },
  addonPanel: { marginTop: 16, padding: 14, backgroundColor: '#f7f8fc', borderRadius: 16 },
  addonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  addonLabel: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  addonSub: { fontSize: 12, color: '#777', marginTop: 2 },
  errorBox: { backgroundColor: '#ffe6e6', borderRadius: 14, padding: 12, marginTop: 16 },
  errorText: { color: '#c62828', fontSize: 13, fontWeight: '700' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, alignItems: 'stretch' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { color: '#666', fontSize: 14 },
  summaryValue: { color: '#1a1a1a', fontSize: 14, fontWeight: '700' },
  summaryTotalRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  summaryTotalLabel: { color: '#1a1a1a', fontSize: 15, fontWeight: '800' },
  summaryTotalValue: { color: ORANGE, fontSize: 15, fontWeight: '800' },

  // Ride options
  rideOptions: { marginTop: 20 },
  rideOptionsTitle: { fontSize: 14, fontWeight: '700', color: '#999', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  rideCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f7f8fc', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent',
  },
  rideCardSelected: { borderColor: ORANGE, backgroundColor: '#FFF8F4' },
  rideIcon: { fontSize: 28, marginRight: 14 },
  rideInfo: { flex: 1 },
  rideName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  rideDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  rideTime: { fontSize: 12, color: '#999', marginTop: 2 },
  ridePriceBlock: { alignItems: 'flex-end' },
  ridePrice: { fontSize: 16, fontWeight: '800', color: ORANGE },
  rideEta: { fontSize: 11, color: '#999', marginTop: 4 },
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
