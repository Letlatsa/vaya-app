import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { API_BASE_URL } from '@/constants/apiConfig';

export interface MapPoint { lat: number; lng: number; label: string }
export interface RideMapProps {
  onPickupSelect: (point: MapPoint) => void;
  onDestinationSelect: (point: MapPoint) => void;
  onRouteInfoChange?: (route: { distance: number; duration: number; coords: { latitude: number; longitude: number }[] } | null) => void;
  pickupMode: boolean;
  pickup?: MapPoint | null;
  destination?: MapPoint | null;
}

export default function RideMap({ onPickupSelect, onDestinationSelect, onRouteInfoChange, pickupMode, pickup, destination }: RideMapProps) {
  const [center, setCenter] = useState({ lat: -29.3167, lng: 27.4833 });
  const pickupModeRef = useRef(pickupMode);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { pickupModeRef.current = pickupMode; }, [pickupMode]);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      if (pickup) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'setPickup', lat: pickup.lat, lng: pickup.lng, label: pickup.label }), '*');
      }
      if (destination) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'setDest', lat: destination.lat, lng: destination.lng, label: destination.label }), '*');
      }
    }
  }, [pickup, destination]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const postToMap = (msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'mapClick') {
          const point: MapPoint = {
            lat: data.lat, lng: data.lng,
            label: data.label || `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
          };
          if (pickupModeRef.current) {
            postToMap({ type: 'setPickup', lat: data.lat, lng: data.lng, label: point.label });
            onPickupSelect(point);
          } else {
            postToMap({ type: 'setDest', lat: data.lat, lng: data.lng, label: point.label });
            onDestinationSelect(point);
          }
        }
        if (data.type === 'routeInfo') {
          onRouteInfoChange?.({
            distance: data.distance,
            duration: data.duration,
            coords: data.coords,
          });
        }
        if (data.type === 'markerDrag') {
          const point: MapPoint = {
            lat: data.lat, lng: data.lng,
            label: data.label || `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
          };
          if (data.markerType === 'pickup') {
            onPickupSelect(point);
          } else {
            onDestinationSelect(point);
          }
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPickupSelect, onDestinationSelect, onRouteInfoChange]);

  const html = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;}
  #route-card{
    position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
    background:#fff;border-radius:16px;padding:12px 18px;
    box-shadow:0 4px 16px rgba(0,0,0,0.18);z-index:1000;
    display:none;min-width:260px;max-width:90vw;
  }
  #route-card .rc-title{font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;}
  .route-opt{
    display:flex;align-items:center;justify-content:space-between;
    padding:8px 10px;border-radius:10px;cursor:pointer;margin-bottom:4px;
    border:2px solid transparent;transition:all 0.15s;
  }
  .route-opt.active{border-color:#FF6B00;background:#FFF8F4;}
  .route-opt:hover{background:#f5f5f5;}
  .route-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;color:#fff;margin-right:10px;}
  .route-info{flex:1;}
  .route-dist{font-size:14px;font-weight:700;color:#1A1A2E;}
  .route-time{font-size:12px;color:#888;margin-top:1px;}
  .route-tag{font-size:10px;font-weight:700;color:#FF6B00;background:#FFF0E6;padding:2px 7px;border-radius:10px;}
</style>
</head><body><div id="map"></div><div id="route-card"><div class="rc-title">Choose Route</div><div id="route-list"></div></div>
<script>
  var map = L.map('map').setView([${center.lat},${center.lng}],14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);

  var pickupMarker=null, destMarker=null, pickupLabelM=null, destLabelM=null;
  var routeLayers=[], routeData=[], pickupPt=null, destPt=null, selectedRouteIdx=0;

  var pickupIcon = L.divIcon({
    className:'',
    html:'<div style="display:flex;flex-direction:column;align-items:center"><div style="background:#FF6B00;width:38px;height:38px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:20px">&#128205;</div><div style="width:3px;height:10px;background:#FF6B00;border-radius:2px"></div></div>',
    iconSize:[38,52],iconAnchor:[19,52]
  });
  var destIcon = L.divIcon({
    className:'',
    html:'<div style="display:flex;flex-direction:column;align-items:center"><div style="background:#1A1A2E;width:38px;height:38px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:20px">&#127937;</div><div style="width:3px;height:10px;background:#1A1A2E;border-radius:2px"></div></div>',
    iconSize:[38,52],iconAnchor:[19,52]
  });

  L.circleMarker([${center.lat},${center.lng}],{radius:9,fillColor:'#4285F4',color:'#fff',weight:2.5,fillOpacity:1}).addTo(map).bindTooltip('You are here',{permanent:false});

  function makeLabelIcon(text,color){
    return L.divIcon({
      className:'',
      html:'<div style="background:'+color+';color:#fff;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25)">'+text+'</div>',
      iconAnchor:[0,0]
    });
  }

  function fmtDist(m){return m>=1000?(m/1000).toFixed(1)+' km':Math.round(m)+' m';}
  function fmtTime(s){var m=Math.round(s/60);return m<60?m+' min':Math.floor(m/60)+'h '+(m%60)+'m';}

  function decodePolyline(str){
    var idx=0,lat=0,lng=0,coords=[];
    while(idx<str.length){
      var b,shift=0,result=0;
      do{b=str.charCodeAt(idx++)-63;result|=(b&0x1f)<<shift;shift+=5;}while(b>=0x20);
      lat+=(result&1)?~(result>>1):(result>>1);
      shift=0;result=0;
      do{b=str.charCodeAt(idx++)-63;result|=(b&0x1f)<<shift;shift+=5;}while(b>=0x20);
      lng+=(result&1)?~(result>>1):(result>>1);
      coords.push([lat/1e5,lng/1e5]);
    }
    return coords;
  }

  function clearRoutes(){
    routeLayers.forEach(function(l){map.removeLayer(l);});
    routeLayers=[];
    document.getElementById('route-card').style.display='none';
    document.getElementById('route-list').innerHTML='';
  }

  function selectRoute(idx){
    selectedRouteIdx=idx;
    routeLayers.forEach(function(l,i){
      l.setStyle(i===idx
        ?{color:'#FF6B00',weight:6,opacity:1}
        :{color:'#90A4AE',weight:4,opacity:0.55,dashArray:'8,6'});
      if(i===idx) l.bringToFront();
    });
    document.querySelectorAll('.route-opt').forEach(function(el,i){
      el.classList.toggle('active',i===idx);
    });
    if(routeData[idx]) {
      var geometry = routeData[idx].geometry;
      window.parent.postMessage(JSON.stringify({
        type: 'routeInfo',
        distance: routeData[idx].distance,
        duration: routeData[idx].duration,
        coords: decodePolyline(geometry).map(function(c){return { latitude: c[0], longitude: c[1] };})
      }), '*');
    }
  }

  function drawRoutes(routes){
    clearRoutes();
    routeData = routes;
    var list=document.getElementById('route-list');
    routes.forEach(function(route,i){
      var coords=decodePolyline(route.geometry);
      var layer=L.polyline(coords,{
        color:i===0?'#FF6B00':'#90A4AE',
        weight:i===0?6:4,
        opacity:i===0?1:0.55,
        dashArray:i===0?null:'8,6',
        lineCap:'round',lineJoin:'round'
      }).addTo(map);
      layer.on('click',function(){selectRoute(i);});
      routeLayers.push(layer);

      var div=document.createElement('div');
      div.className='route-opt'+(i===0?' active':'');
      div.innerHTML='<span class="route-badge" style="background:'+(i===0?'#FF6B00':'#90A4AE')+'">'+(i===0?'Fastest':('Alt '+(i)))+'</span>'
        +'<div class="route-info"><div class="route-dist">'+fmtDist(route.distance)+'</div><div class="route-time">'+fmtTime(route.duration)+'</div></div>'
        +(i===0?'<span class="route-tag">Recommended</span>':'');
      div.addEventListener('click',function(){selectRoute(i);});
      list.appendChild(div);
    });

    document.getElementById('route-card').style.display='block';
    var selectedRoute = routes[0];
    if (selectedRoute) {
      window.parent.postMessage(JSON.stringify({
        type: 'routeInfo',
        distance: selectedRoute.distance,
        duration: selectedRoute.duration,
        coords: decodePolyline(selectedRoute.geometry).map(function(c){return { latitude: c[0], longitude: c[1] };})
      }), '*');
    }
    var allCoords=selectedRoute?decodePolyline(selectedRoute.geometry):[];
    if(allCoords.length) map.fitBounds(L.polyline(allCoords).getBounds().pad(0.25));
  }

  function fetchRoutes(){
    if(!pickupPt||!destPt) return;
    var url='https://router.project-osrm.org/route/v1/driving/'
      +pickupPt.lng+','+pickupPt.lat+';'+destPt.lng+','+destPt.lat
      +'?alternatives=2&geometries=polyline&overview=full';
    fetch(url)
      .then(function(r){return r.json();})
      .then(function(d){
        if(d.routes&&d.routes.length) drawRoutes(d.routes);
      })
      .catch(function(){});
  }

  map.on('click',function(e){
    var lat=e.latlng.lat,lng=e.latlng.lng;
    fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+lat+'&lon='+lng)
      .then(function(r){return r.json();})
      .then(function(d){
        var label=d.display_name?d.display_name.split(',').slice(0,2).join(','):lat.toFixed(5)+', '+lng.toFixed(5);
        window.parent.postMessage(JSON.stringify({type:'mapClick',lat:lat,lng:lng,label:label}),'*');
      })
      .catch(function(){
        window.parent.postMessage(JSON.stringify({type:'mapClick',lat:lat,lng:lng,label:lat.toFixed(5)+', '+lng.toFixed(5)}),'*');
      });
  });

  window.addEventListener('message',function(e){
    try{
      var d=JSON.parse(e.data);
      if(d.type==='setPickup'){
        if(pickupMarker) map.removeLayer(pickupMarker);
        if(pickupLabelM) map.removeLayer(pickupLabelM);
        pickupPt={lat:d.lat,lng:d.lng};
        pickupMarker=L.marker([d.lat,d.lng],{icon:pickupIcon,zIndexOffset:500,draggable:true}).addTo(map);
        pickupMarker.on('dragend',function(e){
          var lat=e.target.getLatLng().lat,lng=e.target.getLatLng().lng;
          fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+lat+'&lon='+lng)
            .then(function(r){return r.json();})
            .then(function(resp){
              var label=resp.display_name?resp.display_name.split(',').slice(0,2).join(','):lat.toFixed(5)+', '+lng.toFixed(5);
              window.parent.postMessage(JSON.stringify({type:'markerDrag',markerType:'pickup',lat:lat,lng:lng,label:label}),'*');
            }).catch(function(){
              window.parent.postMessage(JSON.stringify({type:'markerDrag',markerType:'pickup',lat:lat,lng:lng,label:lat.toFixed(5)+', '+lng.toFixed(5)}),'*');
            });
        });
        pickupLabelM=L.marker([d.lat,d.lng],{icon:makeLabelIcon('Pickup','#FF6B00'),zIndexOffset:1000}).addTo(map);
        clearRoutes();
        fetchRoutes();
      }
      if(d.type==='setDest'){
        if(destMarker) map.removeLayer(destMarker);
        if(destLabelM) map.removeLayer(destLabelM);
        destPt={lat:d.lat,lng:d.lng};
        destMarker=L.marker([d.lat,d.lng],{icon:destIcon,zIndexOffset:500,draggable:true}).addTo(map);
        destMarker.on('dragend',function(e){
          var lat=e.target.getLatLng().lat,lng=e.target.getLatLng().lng;
          fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+lat+'&lon='+lng)
            .then(function(r){return r.json();})
            .then(function(resp){
              var label=resp.display_name?resp.display_name.split(',').slice(0,2).join(','):lat.toFixed(5)+', '+lng.toFixed(5);
              window.parent.postMessage(JSON.stringify({type:'markerDrag',markerType:'destination',lat:lat,lng:lng,label:label}),'*');
            }).catch(function(){
              window.parent.postMessage(JSON.stringify({type:'markerDrag',markerType:'destination',lat:lat,lng:lng,label:lat.toFixed(5)+', '+lng.toFixed(5)}),'*');
            });
        });
        destLabelM=L.marker([d.lat,d.lng],{icon:makeLabelIcon('Destination','#1A1A2E'),zIndexOffset:1000}).addTo(map);
        clearRoutes();
        fetchRoutes();
      }
    }catch(err){}
  });
</script></body></html>`;

  return (
    <View style={styles.container}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="map"
        onLoad={() => {
          if (pickup) postToMap({ type: 'setPickup', lat: pickup.lat, lng: pickup.lng, label: pickup.label });
          if (destination) postToMap({ type: 'setDest', lat: destination.lat, lng: destination.lng, label: destination.label });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
