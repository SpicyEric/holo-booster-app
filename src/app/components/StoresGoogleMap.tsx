import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';

interface Store {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance?: number;
  logo_url?: string | null;
  category?: string | null;
}

interface StoresGoogleMapProps {
  userLocation: [number, number];
  stores: Store[];
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapStyles = [
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

export function StoresGoogleMap({ userLocation, stores }: StoresGoogleMapProps) {
  const navigate = useNavigate();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [markerIcons, setMarkerIcons] = useState<{ [key: string]: google.maps.Icon }>({});

  // Filter stores with valid coordinates (not 0,0)
  const validStores = stores.filter(store => store.lat !== 0 && store.lng !== 0);

  // Calculate center - prefer stores center if available, else user location
  const calculateCenter = useCallback(() => {
    if (validStores.length > 0) {
      const avgLat = validStores.reduce((sum, s) => sum + s.lat, 0) / validStores.length;
      const avgLng = validStores.reduce((sum, s) => sum + s.lng, 0) / validStores.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: userLocation[0], lng: userLocation[1] };
  }, [validStores, userLocation]);

  const center = calculateCenter();

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBZMmrGWon1J1LJDeZ2HgKMF6sd9D2jJ6Q';

  // Fit bounds to show all stores when map loads
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    
    if (validStores.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      // Add all store locations to bounds
      validStores.forEach(store => {
        bounds.extend({ lat: store.lat, lng: store.lng });
      });
      
      // Add user location to bounds
      bounds.extend({ lat: userLocation[0], lng: userLocation[1] });
      
      // Fit the map to show all markers
      mapInstance.fitBounds(bounds);
      
      // Set a max zoom level so we don't zoom in too much
      const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
        const currentZoom = mapInstance.getZoom();
        if (currentZoom && currentZoom > 15) {
          mapInstance.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [validStores, userLocation]);

  useEffect(() => {
    if (!isLoaded || typeof google === 'undefined') return;

    const icons: { [key: string]: google.maps.Icon } = {};

    validStores.forEach((store) => {
      if (store.logo_url) {
        const canvas = document.createElement('canvas');
        const size = 44;
        const borderWidth = 3;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, (size / 2) - borderWidth, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, borderWidth, borderWidth, size - (borderWidth * 2), size - (borderWidth * 2));
            ctx.restore();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, (size / 2) - (borderWidth / 2), 0, Math.PI * 2);
            ctx.strokeStyle = '#9333EA';
            ctx.lineWidth = borderWidth;
            ctx.stroke();

            icons[store.id] = {
              url: canvas.toDataURL(),
              scaledSize: new google.maps.Size(44, 44),
              anchor: new google.maps.Point(22, 22),
            };
            setMarkerIcons({ ...icons });
          };
          img.src = store.logo_url;
        }
      }
    });
  }, [isLoaded, validStores]);

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-xl">
        <p className="text-muted-foreground">Google Maps API Key nicht konfiguriert</p>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      onLoad={() => setIsLoaded(true)}
    >
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          onLoad={onMapLoad}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: mapStyles,
          }}
        >
          {/* User location marker */}
          <Marker
            position={{ lat: userLocation[0], lng: userLocation[1] }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 10,
            }}
            title="Dein Standort"
          />

          {/* Store markers - only valid coordinates */}
          {validStores.map((store) => (
            <Marker
              key={store.id}
              position={{ lat: store.lat, lng: store.lng }}
              onClick={() => setSelectedStore(store)}
              icon={markerIcons[store.id] || {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#9333EA',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 12,
              }}
            />
          ))}

          {selectedStore && (
            <InfoWindow
              position={{ lat: selectedStore.lat, lng: selectedStore.lng }}
              onCloseClick={() => setSelectedStore(null)}
            >
              <div className="p-3 min-w-[200px]">
                <h3 className="font-semibold mb-1 text-foreground">{selectedStore.name}</h3>
                {selectedStore.category && (
                  <p className="text-sm text-muted-foreground mb-2">{selectedStore.category}</p>
                )}
                {selectedStore.distance && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedStore.distance} km entfernt
                  </p>
                )}
                <button
                  onClick={() => navigate(`/app/merchant/${selectedStore.id}`)}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Details anzeigen
                </button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Karte wird geladen...</p>
        </div>
      )}
    </LoadScript>
  );
}
