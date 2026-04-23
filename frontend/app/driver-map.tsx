import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Switch, Modal, Image, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { UserContext } from './_layout';
import { useRouter } from 'expo-router';
import api from '@/constants/apiConfig';

const ORANGE = '#FF6B00';
const DARK   = '#1A1A2E';
const GREEN  = '#22C55E';
const RED    = '#EF4444';
const { width: SW } = Dimensions.get('window');

type PendingTrip = {
  _id: string;
  pickupLocation: { address: string; coordinates: number[] };
  destination:    { address: string; coordinates: number[] };
  rideType: string;
  price: number;
  passenger: { name: string; phoneNumber: string; profilePicture?: string };
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

  const [isOnline, setIsOnline]         = useState(false);
  const [center, setCenter]             = useState({ lat: -29.3167, lng: 27.4833 });
  const [locationReady, setLocationReady] = useState(false);
  const [pendingTrips, setPendingTrips] = useState<PendingTrip[]>([]);
  const [activeTrip, setActiveTrip]     = useState<PendingTrip | null>(null);
  const [accepting, setAccepting]       = useState(false);
  const [todayStats, setTodayStats]     = useState({ trips: 0, km: 0, minutes: 0, earnings: 0 });

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

  // Online timer
  useEffect(() => {
    if (isOnline) {
      timerRef.current = setInterval(() => {
        setTodayStats(s => ({ ...s, minutes: s.minutes + 1 }));
      }, 60000);
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

  const handleAccept = async (trip: PendingTrip) => {
    setAccepting(true);
    try {
      await api.patch(`/api/trips/${trip._id}/accept`);
      setActiveTrip(trip);
      setPendingTrips([]);
      setTodayStats(s => ({ ...s, trips: s.trips + 1, earnings: s.earnings + trip.price }));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to accept trip');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = (tripId: string) => {
    setPendingTrips(prev => prev.filter(t => t._id !== tripId));
  };

  const handleCompleteTrip = () => {
    setActiveTrip(null);
    setTodayStats(s => ({ ...s, km: s.km + Math.round(Math.random() * 8 + 2) }));
  };

  const recenter = () => {
    postToMap({ type: 'recenter', lat: center.lat, lng: center.lng });
  };

  const fmtTime = (min: number) =>
    min === 0 ? '0 min' : min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

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

      {/* ── Top-left controls ── */}
      <View style={styles.topLeft}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
          <Text style={styles.circleBtnIcon}>☰</Text>
        </TouchableOpacity>
        <Image source={{ uri: avatarUrl }} style={styles.avatarSmall} />
      </View>

      {/* ── Top summary card ── */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's total</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{todayStats.trips}</Text>
            <Text style={styles.summaryLabel}>trips</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{todayStats.km} km</Text>
            <Text style={styles.summaryLabel}>distance</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{fmtTime(todayStats.minutes)}</Text>
            <Text style={styles.summaryLabel}>online</Text>
          </View>
        </View>
        <View style={styles.earningsRow}>
          <Text style={styles.earningsAmount}>{todayStats.earnings} LSL</Text>
          <Text style={styles.earningsFees}>  {Math.round(todayStats.earnings * 1.1)} LSL with fees</Text>
        </View>
      </View>

      {/* ── Right floating controls ── */}
      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.circleBtn}>
          <Text style={styles.circleBtnIcon}>🧭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleBtn}>
          <Text style={styles.circleBtnIcon}>⋯</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleBtn} onPress={recenter}>
          <Text style={styles.circleBtnIcon}>◎</Text>
        </TouchableOpacity>
      </View>

      {/* ── SOS button ── */}
      <TouchableOpacity style={styles.sosBtn}>
        <Text style={styles.sosBtnText}>SOS</Text>
      </TouchableOpacity>

      {/* ── Bottom panel ── */}
      <View style={styles.bottomPanel}>
        <View style={styles.preordersRow}>
          <Text style={styles.preordersText}>Preorders ({pendingTrips.length})</Text>
          {isOnline && pendingTrips.length > 0 && <View style={styles.pulseDot} />}
        </View>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>
              {isOnline ? '🟢  You are Online' : '⚫  You are Offline'}
            </Text>
            <Text style={styles.toggleSub}>
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
          <View style={styles.tripCard}>
            <View style={styles.tripCardHeader}>
              <Text style={styles.tripCardTitle}>New Ride Request 🚖</Text>
              <View style={styles.rideTypeBadge}>
                <Text style={styles.rideTypeBadgeText}>{pendingTrips[0]?.rideType}</Text>
              </View>
            </View>

            <View style={styles.passengerRow}>
              <Image
                source={{ uri: pendingTrips[0]?.passenger?.profilePicture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingTrips[0]?.passenger?.name || 'P')}&background=FF6B00&color=fff&size=64`
                }}
                style={styles.passengerAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.passengerName}>{pendingTrips[0]?.passenger?.name}</Text>
                <Text style={styles.passengerPhone}>{pendingTrips[0]?.passenger?.phoneNumber}</Text>
              </View>
              <Text style={styles.tripPrice}>M {pendingTrips[0]?.price}</Text>
            </View>

            <View style={styles.routeBox}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: ORANGE }]} />
                <Text style={styles.routeText} numberOfLines={1}>
                  {pendingTrips[0]?.pickupLocation?.address || 'Pickup'}
                </Text>
              </View>
              <View style={styles.routeConnector} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: DARK }]} />
                <Text style={styles.routeText} numberOfLines={1}>
                  {pendingTrips[0]?.destination?.address || 'Destination'}
                </Text>
              </View>
            </View>

            <View style={styles.tripActions}>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => pendingTrips[0] && handleDecline(pendingTrips[0]._id)}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => pendingTrips[0] && handleAccept(pendingTrips[0])}
                disabled={accepting}
              >
                {accepting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.acceptBtnText}>Accept</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Active trip ── */}
      <Modal transparent animationType="slide" visible={!!activeTrip}>
        <View style={styles.modalOverlay}>
          <View style={styles.tripCard}>
            <Text style={styles.activeTripIcon}>🎉</Text>
            <Text style={[styles.tripCardTitle, { textAlign: 'center', marginBottom: 4 }]}>Trip Accepted!</Text>
            <Text style={styles.activeTripSub}>Head to pickup location</Text>

            <View style={styles.passengerRow}>
              <Image
                source={{ uri: activeTrip?.passenger?.profilePicture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(activeTrip?.passenger?.name || 'P')}&background=FF6B00&color=fff&size=64`
                }}
                style={styles.passengerAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.passengerName}>{activeTrip?.passenger?.name}</Text>
                <Text style={styles.passengerPhone}>{activeTrip?.passenger?.phoneNumber}</Text>
              </View>
              <Text style={styles.tripPrice}>M {activeTrip?.price}</Text>
            </View>

            <View style={styles.routeBox}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: ORANGE }]} />
                <Text style={styles.routeText} numberOfLines={2}>
                  {activeTrip?.pickupLocation?.address || 'Pickup'}
                </Text>
              </View>
              <View style={styles.routeConnector} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: DARK }]} />
                <Text style={styles.routeText} numberOfLines={2}>
                  {activeTrip?.destination?.address || 'Destination'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.acceptBtn} onPress={handleCompleteTrip}>
              <Text style={styles.acceptBtnText}>Complete Trip</Text>
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
  },
  mapPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#dde8dd',
  },
  mapPlaceholderIcon: { fontSize: 52 },
  mapPlaceholderText: { color: '#666', marginTop: 10, fontSize: 14 },

  topLeft: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'column', gap: 10, zIndex: 20,
  },
  avatarSmall: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2.5, borderColor: '#fff',
  },

  summaryCard: {
    position: 'absolute', top: 16,
    left: SW / 2 - 145,
    width: 290,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 14, elevation: 8,
    zIndex: 20,
  },
  summaryTitle: {
    fontSize: 10, color: '#aaa', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 14, fontWeight: '800', color: DARK },
  summaryLabel: { fontSize: 10, color: '#aaa', marginTop: 2 },
  summaryDivider: { width: 1, height: 26, backgroundColor: '#eee' },
  earningsRow: { flexDirection: 'row', alignItems: 'baseline' },
  earningsAmount: { fontSize: 26, fontWeight: '900', color: DARK },
  earningsFees: { fontSize: 12, color: '#aaa' },

  rightControls: {
    position: 'absolute', right: 16, top: '38%',
    flexDirection: 'column', gap: 10, zIndex: 20,
  },
  circleBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 6, elevation: 5,
  },
  circleBtnIcon: { fontSize: 19 },

  sosBtn: {
    position: 'absolute', bottom: 155, left: 16,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: RED, justifyContent: 'center', alignItems: 'center',
    shadowColor: RED, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 7, zIndex: 20,
  },
  sosBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 12, zIndex: 20,
  },
  preordersRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  preordersText: {
    fontSize: 12, fontWeight: '700', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  pulseDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: ORANGE, marginLeft: 8,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f7f8fc', borderRadius: 18, padding: 16,
  },
  toggleLabel: { fontSize: 16, fontWeight: '700', color: DARK },
  toggleSub: { fontSize: 12, color: '#999', marginTop: 3 },

  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tripCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 38,
  },
  tripCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 18,
  },
  tripCardTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  rideTypeBadge: {
    backgroundColor: '#FFF0E6', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  rideTypeBadgeText: { fontSize: 12, fontWeight: '700', color: ORANGE },

  passengerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 16,
  },
  passengerAvatar: { width: 50, height: 50, borderRadius: 25 },
  passengerName: { fontSize: 15, fontWeight: '700', color: DARK },
  passengerPhone: { fontSize: 12, color: '#888', marginTop: 2 },
  tripPrice: { fontSize: 22, fontWeight: '900', color: ORANGE },

  routeBox: {
    backgroundColor: '#f7f8fc', borderRadius: 14,
    padding: 14, marginBottom: 20,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeText: { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },
  routeConnector: {
    width: 2, height: 10, backgroundColor: '#ddd',
    marginLeft: 4, marginVertical: 2,
  },

  tripActions: { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1, borderWidth: 2, borderColor: '#e0e0e0',
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  declineBtnText: { fontSize: 15, fontWeight: '700', color: '#888' },
  acceptBtn: {
    flex: 2, backgroundColor: GREEN,
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  acceptBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  activeTripIcon: { fontSize: 42, textAlign: 'center', marginBottom: 6 },
  activeTripSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 18 },
});
