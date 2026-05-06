import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Switch, Modal, Image, ActivityIndicator, Platform, useWindowDimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { UserContext } from './_layout';
import { useRouter } from 'expo-router';
import api from '@/constants/apiConfig';
import io from 'socket.io-client';

const ORANGE = '#FF6B00';
const DARK   = '#1A1A2E';
const GREEN  = '#22C55E';
const RED    = '#EF4444';
const BLUE   = '#3B82F6';

type TripPhase = 'pending' | 'active' | 'arrived' | 'in_progress' | 'completed';

type PendingTrip = {
  _id: string;
  pickupLocation: { address: string; coordinates: number[] };
  destination:    { address: string; coordinates: number[] };
  rideType: string;
  price: number;
  passenger: { name: string; phoneNumber: string; profilePicture?: string };
  status: TripPhase;
  estimatedDistance?: number;
  estimatedDuration?: number;
};

type NavigationRoute = {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number; address: string };
  waypoints?: Array<{ lat: number; lng: number }>;
};

function buildMapHtml(lat: number, lng: number, online: boolean) {
  const circleColor = online ? '#22C55E' : '#90A4AE';
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var driverIcon = L.divIcon({
      className: '',
      html: '<div style="width:22px;height:22px;background:#4285F4;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.45)"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    L.marker([${lat}, ${lng}], { icon: driverIcon }).addTo(map);

    L.circle([${lat}, ${lng}], {
      radius: 800,
      color: '${circleColor}',
      fillColor: '${circleColor}',
      fillOpacity: 0.07,
      weight: 2,
      dashArray: '6,5'
    }).addTo(map);

    var carIcon = L.divIcon({
      className: '',
      html: '<div style="font-size:22px;line-height:1">&#128663;</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    var offsets = [
      [0.004, 0.006],
      [-0.003, 0.008],
      [0.007, -0.003],
      [-0.005, -0.006]
    ];
    offsets.forEach(function(o) {
      L.marker([${lat} + o[0], ${lng} + o[1]], { icon: carIcon }).addTo(map);
    });

    window.addEventListener('message', function(e) {
      try {
        var d = JSON.parse(e.data);
        if (d.type === 'recenter') {
          map.setView([d.lat, d.lng], 15);
        }
        if (d.type === 'updateCircle') {
          map.eachLayer(function(layer) {
            if (layer instanceof L.Circle) map.removeLayer(layer);
          });
          L.circle([d.lat, d.lng], {
            radius: 800,
            color: d.color,
            fillColor: d.color,
            fillOpacity: 0.07,
            weight: 2,
            dashArray: '6,5'
          }).addTo(map);
        }
      } catch(err) {}
    });
  </script>
</body>
</html>`;
}

export default function DriverMapScreen() {
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const { width, height } = useWindowDimensions();

  // Responsive calculations
  const isSmallScreen = width < 480;
  const isMediumScreen = width < 768;
  const isLandscape = height < width;

  // Responsive dimensions
  const topPadding = Math.min(height * 0.02, 16);
  const sidePadding = Math.min(width * 0.04, 20);
  const avatarSize = Math.min(width * 0.12, 50);
  const avatarSmallSize = Math.min(width * 0.1, 42);
  const circleButtonSize = Math.min(width * 0.14, 54);
  const summaryCareWidth = isSmallScreen ? width - 40 : isMediumScreen ? Math.min(width - 60, 290) : 290;
  const summaryCardLeft = (width - summaryCareWidth) / 2;

  // Responsive font sizes
  const fs = {
    title: Math.min(width * 0.06, 18),
    subtitle: Math.min(width * 0.04, 14),
    body: Math.min(width * 0.035, 13),
    small: Math.min(width * 0.03, 11),
    xsmall: Math.min(width * 0.025, 10),
    large: Math.min(width * 0.055, 22),
    xlarge: Math.min(width * 0.065, 26),
  };

  const [isOnline, setIsOnline]         = useState(false);
  const [center, setCenter]             = useState({ lat: -29.3167, lng: 27.4833 });
  const [locationReady, setLocationReady] = useState(false);
  const [pendingTrips, setPendingTrips] = useState<PendingTrip[]>([]);
  const [activeTrip, setActiveTrip]     = useState<PendingTrip | null>(null);
  const [accepting, setAccepting]       = useState(false);
  const [completing, setCompleting]     = useState(false);
  const [todayStats, setTodayStats]     = useState({ trips: 0, km: 0, minutes: 0, earnings: 0 });
  const [totalSecondsOnline, setTotalSecondsOnline] = useState(0);
  const [tripPhase, setTripPhase] = useState<TripPhase>('pending');
  const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
  const [currentWaypoints, setCurrentWaypoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [arrivalConfirmed, setArrivalConfirmed] = useState(false);
  const [tripCompleted, setTripCompleted] = useState(false);
  const [billing, setBilling] = useState<{ totalCost: number; distance: number } | null>(null);

  const socketRef = useRef<any>(null);
  const locationSubscriptionRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const avatarUrl = userData.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'D')}&background=1A1A2E&color=fff&size=128`;

  // Get GPS location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
      setLocationReady(true);
    })();
  }, []);

  // Socket.IO connection and real-time updates
  useEffect(() => {
    if (!isOnline) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = Platform.OS === 'web' ? 'http://localhost:5000' : 'http://10.0.2.2:5000';
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current?.id);
    });

    socketRef.current.on('trip:assigned', (trip: PendingTrip) => {
      setPendingTrips(prev => [trip, ...prev]);
    });

    socketRef.current.on('trip:cancelled', ({ tripId }: { tripId: string }) => {
      setPendingTrips(prev => prev.filter(t => t._id !== tripId));
      if (activeTrip?._id === tripId) {
        setActiveTrip(null);
        setTripPhase('pending');
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isOnline, activeTrip?._id]);

  // Online timer - counts minutes in real-time
  useEffect(() => {
    if (isOnline) {
      timerRef.current = setInterval(() => {
        setTotalSecondsOnline(prev => {
          const newSeconds = prev + 1;
          const totalMinutes = Math.floor(newSeconds / 60);
          setTodayStats(s => ({ ...s, minutes: totalMinutes }));
          return newSeconds;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOnline]);

  // Poll pending trips when online
  useEffect(() => {
    if (isOnline) {
      fetchPendingTrips();
      pollRef.current = setInterval(fetchPendingTrips, 5000);
      postToMap({ type: 'updateCircle', lat: center.lat, lng: center.lng, color: GREEN });
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setPendingTrips([]);
      postToMap({ type: 'updateCircle', lat: center.lat, lng: center.lng, color: '#90A4AE' });
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOnline]);

  const postToMap = (msg: object) => {
    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify(msg), '*');
    }
  };

  const fetchPendingTrips = async () => {
    try {
      const res = await api.get('/api/trips/pending');
      setPendingTrips(res.data.data || []);
    } catch {}
  };

  const setupNavigationToPickup = (trip: PendingTrip) => {
    const pickupCoords = trip.pickupLocation.coordinates;
    setNavigationRoute({
      origin: { lat: center.lat, lng: center.lng },
      destination: { 
        lat: pickupCoords[1], 
        lng: pickupCoords[0], 
        address: trip.pickupLocation.address 
      }
    });
    setCurrentWaypoints([{ lat: center.lat, lng: center.lng }]);
  };

  const setupNavigationToDestination = (trip: PendingTrip) => {
    const destCoords = trip.destination.coordinates;
    setNavigationRoute({
      origin: { lat: center.lat, lng: center.lng },
      destination: { 
        lat: destCoords[1], 
        lng: destCoords[0], 
        address: trip.destination.address 
      },
      waypoints: currentWaypoints
    });
  };

  const handleAccept = async (trip: PendingTrip) => {
    setAccepting(true);
    try {
      const response = await api.patch(`/api/trips/${trip._id}/accept`);
      const updatedTrip = response.data.data;
      setActiveTrip(updatedTrip);
      setPendingTrips([]);
      setTripPhase('active');
      setTodayStats(s => ({ ...s, trips: s.trips + 1, earnings: s.earnings + trip.price }));
      setupNavigationToPickup(updatedTrip);
      postToMap({ type: 'updateCircle', lat: center.lat, lng: center.lng, color: BLUE });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to accept trip');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = (tripId: string) => {
    setPendingTrips(prev => prev.filter(t => t._id !== tripId));
  };

  const handleArrivedAtPickup = async () => {
    if (!activeTrip) return;
    try {
      await api.put(`/api/trips/${activeTrip._id}/arrived`);
      setTripPhase('arrived');
      setArrivalConfirmed(true);
      // Update navigation to show route to destination
      const destCoords = activeTrip.destination.coordinates;
      setNavigationRoute({
        origin: navigationRoute?.destination || { lat: center.lat, lng: center.lng, address: 'Pickup' },
        destination: { 
          lat: destCoords[1], 
          lng: destCoords[0], 
          address: activeTrip.destination.address 
        },
        waypoints: currentWaypoints
      });
      Alert.alert('Arrived', 'You have arrived at the pickup location. The route to destination is now active.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to mark arrival');
    }
  };

  const handleStartTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.put(`/api/trips/${activeTrip._id}/start`);
      setTripPhase('in_progress');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to start trip');
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) {
      Alert.alert('Error', 'No active trip found');
      return;
    }
    
    setCompleting(true);
    try {
      // Add current location as waypoint if not already present
      const waypoints = [...currentWaypoints];
      const lastWaypoint = waypoints[waypoints.length - 1];
      if (!lastWaypoint || lastWaypoint.lat !== center.lat || lastWaypoint.lng !== center.lng) {
        waypoints.push({ lat: center.lat, lng: center.lng });
        setCurrentWaypoints(waypoints);
      }
      
      const distance = waypoints.length >= 2 ? calculateTotalDistance() : (activeTrip.estimatedDistance || 5);
      const durationMinutes = Math.round(distance / 40 * 60);
      
      const response = await api.put(`/api/trips/${activeTrip._id}/complete`, {
        actualDistance: distance,
        actualDuration: durationMinutes,
        waypoints: waypoints
      });
      
      // Log full response for debugging
      console.log('Complete trip response:', response.data);
      
      // Parse billing from response - backend returns data: { trip: ..., billing: ... }
      const billingData = response.data?.data?.billing || { totalCost: distance * 10, distanceKm: distance };
      
      setBilling({
        totalCost: billingData.totalCost,
        distance: billingData.distanceKm
      });
      
      setTripPhase('completed');
      setTripCompleted(true);
      setTodayStats(s => ({ ...s, km: s.km + Math.round(distance) }));
      
    } catch (e: any) {
      console.error('Complete trip error:', e.response?.data || e.message);
      Alert.alert('Error', e.response?.data?.message || 'Failed to complete trip. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const handleCashPayment = async () => {
    if (!activeTrip || !billing) return;
    
    try {
      await api.post(`/api/trips/${activeTrip._id}/payment`, {
        method: 'CASH'
      });
      
      // Reset trip state after successful payment
      setTripCompleted(false);
      setBilling(null);
      setActiveTrip(null);
      setTripPhase('pending');
      setNavigationRoute(null);
      setCurrentWaypoints([]);
      setArrivalConfirmed(false);
      
      Alert.alert('Success', 'Cash payment confirmed! Trip completed.', [{ text: 'OK', onPress: () => {} }]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Payment processing failed');
    }
  };

  const calculateTotalDistance = () => {
    if (currentWaypoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < currentWaypoints.length - 1; i++) {
      const p1 = currentWaypoints[i];
      const p2 = currentWaypoints[i + 1];
      total += calculateHaversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    return total;
  };

  const calculateHaversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const resetTrip = () => {
    setActiveTrip(null);
    setTripPhase('pending');
    setNavigationRoute(null);
    setCurrentWaypoints([]);
    setArrivalConfirmed(false);
    setTripCompleted(false);
    setBilling(null);
  };

  const recenter = () => {
    postToMap({ type: 'recenter', lat: center.lat, lng: center.lng });
  };

  const fmtTime = (min: number) =>
    min === 0 ? '0 min' : min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  const getPhaseColor = (phase: TripPhase) => {
    switch (phase) {
      case 'active': return ORANGE;
      case 'arrived': return BLUE;
      case 'in_progress': return GREEN;
      default: return '#888';
    }
  };

  const getPhaseLabel = (phase: TripPhase) => {
    switch (phase) {
      case 'active': return 'EN ROUTE TO PICKUP';
      case 'arrived': return 'WAITING FOR PASSENGER';
      case 'in_progress': return 'TRIP IN PROGRESS';
      default: return 'TRIP ACTIVE';
    }
  };

  const mapHtml = locationReady ? buildMapHtml(center.lat, center.lng, isOnline) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Full-screen map layer ── */}
      <View style={styles.mapLayer}>
        {Platform.OS === 'web' && mapHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' } as any}
            title="driver-map"
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
            <Text style={styles.mapPlaceholderText}>Map loads on device</Text>
          </View>
        )}
      </View>

      {/* ── Top header bar with profile, menu and price icon ── */}
      <View style={[styles.topHeader, { top: topPadding, left: sidePadding, right: sidePadding, height: Math.max(circleButtonSize + 8, 60) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.min(width * 0.02, 8) }}>
          <Image source={{ uri: avatarUrl }} style={{ width: avatarSmallSize, height: avatarSmallSize, borderRadius: avatarSmallSize / 2, borderWidth: 2, borderColor: '#fff' }} />
          <TouchableOpacity style={[styles.circleBtn, { width: circleButtonSize, height: circleButtonSize, borderRadius: circleButtonSize / 2 }]} onPress={() => router.back()}>
            <Text style={[styles.circleBtnIcon, { fontSize: Math.min(width * 0.05, 19) }]}>☰</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.circleBtn, { width: circleButtonSize, height: circleButtonSize, borderRadius: circleButtonSize / 2 }]}>
          <Text style={[styles.circleBtnIcon, { fontSize: Math.min(width * 0.05, 19) }]}>💰</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary card below header ── */}
      <View style={[styles.summaryCard, { top: topPadding + Math.max(circleButtonSize, 52) + Math.min(height * 0.015, 12), left: sidePadding, right: sidePadding, width: 'auto', paddingHorizontal: Math.min(width * 0.035, 14), paddingVertical: Math.min(height * 0.015, 14) }]}>
        <Text style={[styles.summaryTitle, { fontSize: fs.xsmall }]}>Today's total</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { fontSize: fs.subtitle }]}>{todayStats.trips}</Text>
            <Text style={[styles.summaryLabel, { fontSize: fs.xsmall }]}>trips</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { fontSize: fs.subtitle }]}>{todayStats.km} km</Text>
            <Text style={[styles.summaryLabel, { fontSize: fs.xsmall }]}>distance</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { fontSize: fs.subtitle }]}>{fmtTime(todayStats.minutes)}</Text>
            <Text style={[styles.summaryLabel, { fontSize: fs.xsmall }]}>online</Text>
          </View>
        </View>
        <View style={styles.earningsRow}>
          <Text style={[styles.earningsAmount, { fontSize: fs.xlarge }]}>{todayStats.earnings} LSL</Text>
          <Text style={[styles.earningsFees, { fontSize: fs.small }]}>  {Math.round(todayStats.earnings * 1.1)} LSL with fees</Text>
        </View>
      </View>

      {/* ── Right floating controls ── */}
      <View style={[styles.rightControls, { right: sidePadding, top: height * (isLandscape ? 0.25 : 0.38), gap: Math.min(height * 0.015, 12) }]}>
        <TouchableOpacity style={[styles.circleBtn, { width: circleButtonSize, height: circleButtonSize, borderRadius: circleButtonSize / 2 }]}>
          <Text style={[styles.circleBtnIcon, { fontSize: Math.min(width * 0.05, 19) }]}>🧭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.circleBtn, { width: circleButtonSize, height: circleButtonSize, borderRadius: circleButtonSize / 2 }]}>
          <Text style={[styles.circleBtnIcon, { fontSize: Math.min(width * 0.05, 19) }]}>⋯</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.circleBtn, { width: circleButtonSize, height: circleButtonSize, borderRadius: circleButtonSize / 2 }]} onPress={recenter}>
          <Text style={[styles.circleBtnIcon, { fontSize: Math.min(width * 0.05, 19) }]}>◎</Text>
        </TouchableOpacity>
      </View>

      {/* ── SOS button ── */}
      <TouchableOpacity style={[styles.sosBtn, { bottom: Math.min(height * 0.25, 180), left: sidePadding, width: circleButtonSize * 1.2, height: circleButtonSize * 1.2, borderRadius: circleButtonSize * 0.6 }]}>
        <Text style={[styles.sosBtnText, { fontSize: Math.min(width * 0.03, 13) }]}>SOS</Text>
      </TouchableOpacity>

      {/* ── Bottom panel ── */}
      <View style={[styles.bottomPanel, { paddingHorizontal: sidePadding, paddingTop: Math.min(height * 0.02, 18), paddingBottom: Math.min(height * 0.05, 34) }]}>
        <View style={styles.preordersRow}>
          <Text style={[styles.preordersText, { fontSize: fs.xsmall }]}>Preorders ({pendingTrips.length})</Text>
          {isOnline && pendingTrips.length > 0 && <View style={styles.pulseDot} />}
        </View>
        <View style={[styles.toggleRow, { padding: sidePadding }]}>
          <View>
            <Text style={[styles.toggleLabel, { fontSize: fs.subtitle }]}>
              {isOnline ? '🟢  You are Online' : '⚫  You are Offline'}
            </Text>
            <Text style={[styles.toggleSub, { fontSize: fs.small }]}>
              {isOnline ? 'Receiving ride requests' : 'Tap to go online'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: '#e0e0e0', true: GREEN + '66' }}
            thumbColor={isOnline ? GREEN : '#bbb'}
            ios_backgroundColor="#e0e0e0"
          />
        </View>
      </View>

      {/* ── Incoming trip request ── */}
      <Modal transparent animationType="slide" visible={pendingTrips.length > 0 && isOnline && !activeTrip}>
        <View style={styles.modalOverlay}>
          <View style={[styles.tripCard, { paddingHorizontal: sidePadding, paddingVertical: Math.min(height * 0.03, 24) }]}>
            <View style={[styles.tripCardHeader, { marginBottom: Math.min(height * 0.02, 18) }]}>
              <Text style={[styles.tripCardTitle, { fontSize: fs.title }]}>New Ride Request 🚖</Text>
              <View style={styles.rideTypeBadge}>
                <Text style={[styles.rideTypeBadgeText, { fontSize: fs.small }]}>{pendingTrips[0]?.rideType}</Text>
              </View>
            </View>

            <View style={[styles.passengerRow, { gap: Math.min(width * 0.04, 12), marginBottom: Math.min(height * 0.02, 16) }]}>
              <Image
                source={{ uri: pendingTrips[0]?.passenger?.profilePicture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingTrips[0]?.passenger?.name || 'P')}&background=FF6B00&color=fff&size=64`
                }}
                style={[styles.passengerAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.passengerName, { fontSize: fs.body }]}>{pendingTrips[0]?.passenger?.name}</Text>
                <Text style={[styles.passengerPhone, { fontSize: fs.small }]}>{pendingTrips[0]?.passenger?.phoneNumber}</Text>
              </View>
              <Text style={[styles.tripPrice, { fontSize: Math.min(width * 0.07, 22) }]}>M {pendingTrips[0]?.price}</Text>
            </View>

            <View style={[styles.routeBox, { padding: Math.min(width * 0.03, 14), marginBottom: Math.min(height * 0.02, 20) }]}>
              <View style={[styles.routeRow, { gap: Math.min(width * 0.025, 10) }]}>
                <View style={[styles.routeDot, { backgroundColor: ORANGE }]} />
                <Text style={[styles.routeText, { fontSize: fs.small }]} numberOfLines={1}>
                  {pendingTrips[0]?.pickupLocation?.address || 'Pickup'}
                </Text>
              </View>
              <View style={styles.routeConnector} />
              <View style={[styles.routeRow, { gap: Math.min(width * 0.025, 10) }]}>
                <View style={[styles.routeDot, { backgroundColor: DARK }]} />
                <Text style={[styles.routeText, { fontSize: fs.small }]} numberOfLines={1}>
                  {pendingTrips[0]?.destination?.address || 'Destination'}
                </Text>
              </View>
            </View>

            <View style={[styles.tripActions, { gap: Math.min(width * 0.03, 12) }]}>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => pendingTrips[0] && handleDecline(pendingTrips[0]._id)}
              >
                <Text style={[styles.declineBtnText, { fontSize: fs.body }]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => pendingTrips[0] && handleAccept(pendingTrips[0])}
                disabled={accepting}
              >
                {accepting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.acceptBtnText, { fontSize: fs.body }]}>Accept</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Active trip ── */}
      <Modal transparent animationType="slide" visible={!!activeTrip && !tripCompleted}>
        <View style={styles.modalOverlay}>
          <View style={[styles.tripCard, { paddingHorizontal: sidePadding, paddingVertical: Math.min(height * 0.03, 24) }]}>
            <View style={[styles.tripPhaseBadge, { backgroundColor: getPhaseColor(tripPhase) }]}>
              <Text style={styles.tripPhaseBadgeText}>{getPhaseLabel(tripPhase)}</Text>
            </View>
            
            <View style={[styles.passengerRow, { gap: Math.min(width * 0.04, 12) }]}>
              <Image
                source={{ uri: activeTrip?.passenger?.profilePicture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(activeTrip?.passenger?.name || 'P')}&background=FF6B00&color=fff&size=64`
                }}
                style={[styles.passengerAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.passengerName, { fontSize: fs.body }]}>{activeTrip?.passenger?.name}</Text>
                <Text style={[styles.passengerPhone, { fontSize: fs.small }]}>{activeTrip?.passenger?.phoneNumber}</Text>
              </View>
              <Text style={[styles.tripPrice, { fontSize: Math.min(width * 0.07, 22) }]}>M {activeTrip?.price}</Text>
            </View>

            {navigationRoute && (
              <View style={[styles.navigationBox, { padding: Math.min(width * 0.03, 14), marginBottom: Math.min(height * 0.02, 20) }]}>
                <Text style={[styles.navigationLabel, { fontSize: fs.xsmall }]}>Navigation</Text>
                <Text style={[styles.navigationDest, { fontSize: fs.small }]} numberOfLines={1}>
                  {navigationRoute.destination.address}
                </Text>
              </View>
            )}

            <View style={[styles.routeBox, { padding: Math.min(width * 0.03, 14), marginBottom: Math.min(height * 0.02, 20) }]}>
              <View style={[styles.routeRow, { gap: Math.min(width * 0.025, 10) }]}>
                <View style={[styles.routeDot, { backgroundColor: ORANGE }]} />
                <Text style={[styles.routeText, { fontSize: fs.small }]} numberOfLines={2}>
                  {activeTrip?.pickupLocation?.address || 'Pickup'}
                </Text>
              </View>
              <View style={styles.routeConnector} />
              <View style={[styles.routeRow, { gap: Math.min(width * 0.025, 10) }]}>
                <View style={[styles.routeDot, { backgroundColor: DARK }]} />
                <Text style={[styles.routeText, { fontSize: fs.small }]} numberOfLines={2}>
                  {activeTrip?.destination?.address || 'Destination'}
                </Text>
              </View>
            </View>

            {tripPhase === 'active' && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleArrivedAtPickup}>
                <Text style={[styles.actionBtnText, { fontSize: fs.body }]}>Arrived at Pickup</Text>
              </TouchableOpacity>
            )}

            {tripPhase === 'arrived' && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleStartTrip}>
                <Text style={[styles.actionBtnText, { fontSize: fs.body }]}>Start Trip</Text>
              </TouchableOpacity>
            )}

{tripPhase === 'in_progress' && (
               <TouchableOpacity style={styles.actionBtn} onPress={handleCompleteTrip} disabled={completing}>
                {completing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.actionBtnText, { fontSize: fs.body }]}>Complete Trip</Text>
                )}
               </TouchableOpacity>
             )}
          </View>
        </View>
      </Modal>

      {/* ── Trip Completed ── */}
      <Modal transparent animationType="slide" visible={tripCompleted && !!billing}>
        <View style={styles.modalOverlay}>
          <View style={[styles.tripCard, { paddingHorizontal: sidePadding, paddingVertical: Math.min(height * 0.03, 24) }]}>
            <Text style={[styles.completedIcon, { fontSize: Math.min(width * 0.15, 42) }]}>💰</Text>
            <Text style={[styles.completedTitle, { fontSize: fs.title }]}>Trip Completed!</Text>
            
            <View style={styles.billingBox}>
              <View style={styles.billingRow}>
                <Text style={[styles.billingLabel, { fontSize: fs.body }]}>Distance</Text>
                <Text style={[styles.billingValue, { fontSize: fs.body }]}>{billing?.distance.toFixed(1)} km</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={[styles.billingLabel, { fontSize: fs.body }]}>Total Fare</Text>
                <Text style={[styles.billingAmount, { fontSize: fs.large }]}>M {billing?.totalCost.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.cashBtn} onPress={handleCashPayment}>
              <Text style={[styles.cashBtnText, { fontSize: fs.body }]}>Cash Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#e8ede8' },

  mapLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1,
  },
  mapPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#dde8dd',
  },
  mapPlaceholderIcon: { fontSize: 52 },
  mapPlaceholderText: { color: '#666', marginTop: 10, fontSize: 14 },

  topHeader: {
    position: 'absolute',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    zIndex: 100,
  },
  topLeft: {
    position: 'absolute',
    flexDirection: 'column', zIndex: 100,
  },
  avatarSmall: {
    borderWidth: 2.5, borderColor: '#fff',
  },

  summaryCard: {
    position: 'absolute',
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 14, elevation: 8,
    zIndex: 100,
  },
  summaryTitle: {
    color: '#aaa', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontWeight: '800', color: DARK },
  summaryLabel: { color: '#aaa', marginTop: 2 },
  summaryDivider: { width: 1, height: 26, backgroundColor: '#eee' },
  earningsRow: { flexDirection: 'row', alignItems: 'baseline' },
  earningsAmount: { fontWeight: '900', color: DARK },
  earningsFees: { color: '#aaa' },

  rightControls: {
    position: 'absolute',
    flexDirection: 'column', zIndex: 100,
  },
  circleBtn: {
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 6, elevation: 5,
  },
  circleBtnIcon: {},

  sosBtn: {
    position: 'absolute',
    backgroundColor: RED, justifyContent: 'center', alignItems: 'center',
    shadowColor: RED, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 7, zIndex: 100,
  },
  sosBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.5 },

  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 12, zIndex: 100,
  },
  preordersRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  preordersText: {
    fontWeight: '700', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  pulseDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: ORANGE, marginLeft: 8,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f7f8fc', borderRadius: 18,
  },
  toggleLabel: { fontWeight: '700', color: DARK },
  toggleSub: { color: '#999', marginTop: 3 },

  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tripCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 38,
  },
  tripCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripCardTitle: { fontWeight: '800', color: DARK },
  rideTypeBadge: {
    backgroundColor: '#FFF0E6', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  rideTypeBadgeText: { fontWeight: '700', color: ORANGE },

  passengerRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  passengerAvatar: { borderRadius: 25 },
  passengerName: { fontWeight: '700', color: DARK },
  passengerPhone: { color: '#888', marginTop: 2 },
  tripPrice: { fontWeight: '900', color: ORANGE },

  routeBox: {
    backgroundColor: '#f7f8fc', borderRadius: 14,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeText: { flex: 1, color: '#333', fontWeight: '500' },
  routeConnector: {
    width: 2, height: 10, backgroundColor: '#ddd',
    marginLeft: 4, marginVertical: 2,
  },

  tripActions: { flexDirection: 'row' },
  declineBtn: {
    flex: 1, borderWidth: 2, borderColor: '#e0e0e0',
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  declineBtnText: { fontWeight: '700', color: '#888' },
  acceptBtn: {
    flex: 2, backgroundColor: GREEN,
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  acceptBtnText: { fontWeight: '800', color: '#fff' },

  activeTripIcon: { textAlign: 'center', marginBottom: 6 },
  activeTripSub: { color: '#888', textAlign: 'center' },
  
  tripPhaseBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 12,
  },
  tripPhaseBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  navigationBox: {
    backgroundColor: '#e8f0fe',
    borderRadius: 12,
    marginBottom: 15,
  },
  navigationLabel: {
    color: BLUE,
    fontWeight: '700',
    marginBottom: 4,
  },
  navigationDest: {
    color: DARK,
    fontWeight: '500',
  },
  
  actionBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  actionBtnText: {
    fontWeight: '800',
    color: '#fff',
  },
  
  completedIcon: { textAlign: 'center', marginBottom: 6 },
  completedTitle: { fontWeight: '800', color: DARK, textAlign: 'center', marginBottom: 20 },
  
  billingBox: {
    backgroundColor: '#f7f8fc',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  billingLabel: {
    color: '#666',
  },
  billingValue: {
    fontWeight: '700',
    color: DARK,
  },
  billingAmount: {
    fontWeight: '900',
    color: ORANGE,
  },
  
  cashBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cashBtnText: {
    fontWeight: '800',
    color: '#fff',
    fontSize: 16,
  },
});
