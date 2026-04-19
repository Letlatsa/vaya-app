import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

export interface MapPoint { lat: number; lng: number; label: string }
export interface RideMapProps {
  onPickupSelect: (point: MapPoint) => void;
  onDestinationSelect: (point: MapPoint) => void;
  pickupMode: boolean;
}

type LatLng = { latitude: number; longitude: number };
type Route = { coords: LatLng[]; distance: number; duration: number };

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results[0]) {
      const r = results[0];
      return [r.name, r.street, r.city].filter(Boolean).join(', ');
    }
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function decodePolyline(str: string): LatLng[] {
  let idx = 0, lat = 0, lng = 0;
  const coords: LatLng[] = [];
  while (idx < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

function fmtDist(m: number) { return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m'; }
function fmtTime(s: number) { const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; }

async function fetchRoutes(pickup: MapPoint, dest: MapPoint): Promise<Route[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dest.lng},${dest.lat}?alternatives=2&geometries=polyline&overview=full`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.length) {
      return data.routes.map((r: any) => ({
        coords: decodePolyline(r.geometry),
        distance: r.distance,
        duration: r.duration,
      }));
    }
  } catch {}
  return [];
}

export default function RideMap({ onPickupSelect, onDestinationSelect, pickupMode }: RideMapProps) {
  const [region, setRegion] = useState({
    latitude: -29.3167, longitude: 27.4833,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  });
  const [pickup, setPickup]           = useState<MapPoint | null>(null);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [routes, setRoutes]           = useState<Route[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion(r => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
      }
      setLoading(false);
    })();
  }, []);

  const loadRoutes = async (p: MapPoint, d: MapPoint) => {
    setRouteLoading(true);
    setRoutes([]);
    setSelectedIdx(0);
    const result = await fetchRoutes(p, d);
    setRoutes(result);
    setRouteLoading(false);
  };

  const handlePress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const label = await reverseGeocode(latitude, longitude);
    const point: MapPoint = { lat: latitude, lng: longitude, label };
    if (pickupMode) {
      setPickup(point);
      setRoutes([]);
      onPickupSelect(point);
      if (destination) loadRoutes(point, destination);
    } else {
      setDestination(point);
      setRoutes([]);
      onDestinationSelect(point);
      if (pickup) loadRoutes(pickup, point);
    }
  };

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={ORANGE} />
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView style={StyleSheet.absoluteFill} region={region} onPress={handlePress} showsUserLocation>

        {/* Alternative routes (drawn first, behind main) */}
        {routes.map((route, i) => i !== selectedIdx && (
          <Polyline
            key={`alt-${i}`}
            coordinates={route.coords}
            strokeColor="#90A4AE"
            strokeWidth={4}
            lineDashPattern={[8, 6]}
            tappable
            onPress={() => setSelectedIdx(i)}
          />
        ))}

        {/* Selected route (drawn on top) */}
        {routes[selectedIdx] && (
          <Polyline
            key={`main-${selectedIdx}`}
            coordinates={routes[selectedIdx].coords}
            strokeColor={ORANGE}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Pickup marker */}
        {pickup && (
          <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.pin}>
              <View style={[styles.pinHead, { backgroundColor: ORANGE }]}>
                <Text style={styles.pinEmoji}>📍</Text>
              </View>
              <View style={[styles.pinStem, { backgroundColor: ORANGE }]} />
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text style={[styles.calloutTitle, { color: ORANGE }]}>Pickup</Text>
                <Text style={styles.calloutLabel}>{pickup.label}</Text>
              </View>
            </Callout>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.pin}>
              <View style={[styles.pinHead, { backgroundColor: DARK }]}>
                <Text style={styles.pinEmoji}>🏁</Text>
              </View>
              <View style={[styles.pinStem, { backgroundColor: DARK }]} />
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text style={[styles.calloutTitle, { color: DARK }]}>Destination</Text>
                <Text style={styles.calloutLabel}>{destination.label}</Text>
              </View>
            </Callout>
          </Marker>
        )}
      </MapView>

      {/* Route info card */}
      {routeLoading && (
        <View style={styles.routeCard}>
          <ActivityIndicator size="small" color={ORANGE} />
          <Text style={styles.routeLoadingText}>Finding routes...</Text>
        </View>
      )}

      {!routeLoading && routes.length > 0 && (
        <View style={styles.routeCard}>
          <Text style={styles.routeCardTitle}>Choose Route</Text>
          {routes.map((route, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.routeOption, i === selectedIdx && styles.routeOptionActive]}
              onPress={() => setSelectedIdx(i)}
              activeOpacity={0.8}
            >
              <View style={[styles.routeBadge, { backgroundColor: i === selectedIdx ? ORANGE : '#90A4AE' }]}>
                <Text style={styles.routeBadgeText}>{i === 0 ? 'Fastest' : `Alt ${i}`}</Text>
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeDist}>{fmtDist(route.distance)}</Text>
                <Text style={styles.routeTime}>{fmtTime(route.duration)}</Text>
              </View>
              {i === 0 && <View style={styles.recommendedTag}><Text style={styles.recommendedText}>Recommended</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },

  pin: { alignItems: 'center' },
  pinHead: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 5, elevation: 6,
  },
  pinEmoji: { fontSize: 20 },
  pinStem: { width: 3, height: 10, borderRadius: 2 },
  callout: { padding: 8, minWidth: 140, maxWidth: 220 },
  calloutTitle: { fontSize: 12, fontWeight: '800', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  calloutLabel: { fontSize: 13, color: '#333', lineHeight: 18 },

  routeCard: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    minWidth: 260, maxWidth: '88%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    flexDirection: 'column', gap: 6,
  },
  routeCardTitle: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  routeLoadingText: { fontSize: 13, color: '#888', marginLeft: 10 },

  routeOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 10,
    borderWidth: 2, borderColor: 'transparent',
  },
  routeOptionActive: { borderColor: ORANGE, backgroundColor: '#FFF8F4' },
  routeBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginRight: 10,
  },
  routeBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  routeInfo: { flex: 1 },
  routeDist: { fontSize: 14, fontWeight: '700', color: DARK },
  routeTime: { fontSize: 12, color: '#888', marginTop: 1 },
  recommendedTag: { backgroundColor: '#FFF0E6', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  recommendedText: { fontSize: 10, fontWeight: '700', color: ORANGE },
});
