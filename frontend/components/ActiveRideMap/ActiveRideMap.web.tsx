import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

export interface ActiveRideMapProps {
  driverLocation: { lat: number; lng: number } | null;
  pickupLocation: { lat: number; lng: number; address: string };
  routeCoords: { latitude: number; longitude: number }[];
}

export default function ActiveRideMap({ driverLocation, pickupLocation, routeCoords }: ActiveRideMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      // Send pickup location
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        type: 'setPickup',
        lat: pickupLocation.lat,
        lng: pickupLocation.lng,
        address: pickupLocation.address
      }), '*');

      // Send driver location if available
      if (driverLocation) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          type: 'setDriver',
          lat: driverLocation.lat,
          lng: driverLocation.lng
        }), '*');
      }

      // Send route coordinates if available
      if (routeCoords.length > 0) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          type: 'setRoute',
          coords: routeCoords
        }), '*');
      }
    }
  }, [driverLocation, pickupLocation, routeCoords]);

  const html = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;}
</style>
</head><body>
<div id="map"></div>
<script>
  const map = L.map('map').setView([${pickupLocation.lat}, ${pickupLocation.lng}], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let pickupMarker = null;
  let driverMarker = null;
  let routePolyline = null;

  window.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'setPickup') {
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker([data.lat, data.lng]).addTo(map)
          .bindPopup(data.address || 'Pickup Location');
        map.setView([data.lat, data.lng], 14);
      } else if (data.type === 'setDriver') {
        if (driverMarker) map.removeLayer(driverMarker);
        driverMarker = L.marker([data.lat, data.lng], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).addTo(map).bindPopup('Driver Location');
      } else if (data.type === 'setRoute') {
        if (routePolyline) map.removeLayer(routePolyline);
        routePolyline = L.polyline(data.coords.map(c => [c.latitude, c.longitude]), {
          color: '#FF6B00',
          weight: 4
        }).addTo(map);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });
</script>
</body></html>`;

  return (
    <View style={styles.container}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={styles.iframe}
        title="Active Ride Map"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iframe: { width: '100%', height: '100%', border: 'none' },
});
