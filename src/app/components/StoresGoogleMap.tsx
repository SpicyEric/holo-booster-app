import { useEffect, useState, useCallback, Component, type ReactNode, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

const LIBRARIES: ('places')[] = ['places'];
const MAP_RENDER_TIMEOUT_MS = 12000;

// ─── Error Boundary ───
interface ErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: Error) {
    console.error('[GoogleMap] Crash:', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-muted-foreground text-center">Die Karte konnte nicht geladen werden.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Map Content ───
function StoresGoogleMapContent({
  userLocation,
  stores,
  apiKey,
  onRetry,
}: StoresGoogleMapProps & { apiKey: string; onRetry: () => void }) {
  const navigate = useNavigate();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerIcons, setMarkerIcons] = useState<Record<string, google.maps.Icon>>({});
  const [initialCenterSet, setInitialCenterSet] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderTimeoutRef = useRef<number | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const clearRenderTimeout = useCallback(() => {
    if (renderTimeoutRef.current !== null) {
      window.clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
    }
  }, []);

  const startRenderTimeout = useCallback(() => {
    clearRenderTimeout();
    renderTimeoutRef.current = window.setTimeout(() => {
      setRenderError('Die Karte konnte nicht vollständig geladen werden.');
    }, MAP_RENDER_TIMEOUT_MS);
  }, [clearRenderTimeout]);

  const validStores = stores.filter((store) => store.lat !== 0 && store.lng !== 0);
  const center = { lat: userLocation[0], lng: userLocation[1] };

  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      setTilesLoaded(false);
      setRenderError(null);
      mapInstance.setCenter({ lat: userLocation[0], lng: userLocation[1] });
      mapInstance.setZoom(14);
      setInitialCenterSet(true);
      startRenderTimeout();
    },
    [startRenderTimeout, userLocation]
  );

  const onMapTilesLoaded = useCallback(() => {
    setTilesLoaded(true);
    setRenderError(null);
    clearRenderTimeout();
  }, [clearRenderTimeout]);

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    const previousAuthFailure = (window as typeof window & { gm_authFailure?: () => void }).gm_authFailure;

    (window as typeof window & { gm_authFailure?: () => void }).gm_authFailure = () => {
      console.error('[GoogleMap] gm_authFailure triggered');
      setRenderError('Google Maps konnte nicht autorisiert werden.');
      clearRenderTimeout();
    };

    return () => {
      (window as typeof window & { gm_authFailure?: () => void }).gm_authFailure = previousAuthFailure;
    };
  }, [clearRenderTimeout, isLoaded]);

  useEffect(() => {
    if (!isLoaded || typeof google === 'undefined') return;

    setMarkerIcons({});

    validStores.forEach((store) => {
      if (!store.logo_url) return;

      const canvas = document.createElement('canvas');
      const size = 44;
      const borderWidth = 3;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - borderWidth, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, borderWidth, borderWidth, size - borderWidth * 2, size - borderWidth * 2);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - borderWidth / 2, 0, Math.PI * 2);
          ctx.strokeStyle = '#9333EA';
          ctx.lineWidth = borderWidth;
          ctx.stroke();

          const icon: google.maps.Icon = {
            url: canvas.toDataURL(),
            scaledSize: new google.maps.Size(44, 44),
            anchor: new google.maps.Point(22, 22),
          };

          setMarkerIcons((prev) => ({ ...prev, [store.id]: icon }));
        } catch (error) {
          console.warn('[GoogleMap] Marker icon render failed, using fallback icon:', error);
        }
      };

      img.onerror = () => {
        console.warn(`[GoogleMap] Logo could not be loaded for store ${store.id}`);
      };

      img.src = store.logo_url;
    });
  }, [isLoaded, validStores]);

  useEffect(() => {
    if (loadError) {
      setRenderError('Google Maps konnte nicht geladen werden.');
      clearRenderTimeout();
    }
  }, [clearRenderTimeout, loadError]);

  useEffect(() => {
    return () => {
      clearRenderTimeout();
    };
  }, [clearRenderTimeout]);

  if (renderError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 bg-muted rounded-xl">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground text-sm text-center">{renderError}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        <p className="text-muted-foreground text-sm">Karte wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!tilesLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/80">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Karte wird gerendert...</p>
          </div>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={!initialCenterSet ? center : undefined}
        zoom={!initialCenterSet ? 14 : undefined}
        onLoad={onMapLoad}
        onTilesLoaded={onMapTilesLoaded}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: mapStyles,
          gestureHandling: 'greedy',
          draggable: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
          clickableIcons: false,
        }}
      >
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

        {validStores.map((store) => (
          <Marker
            key={store.id}
            position={{ lat: store.lat, lng: store.lng }}
            onClick={() => setSelectedStore(store)}
            icon={
              markerIcons[store.id] || {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#9333EA',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 12,
              }
            }
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
                <p className="text-sm text-muted-foreground mb-3">{selectedStore.distance} km entfernt</p>
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
    </div>
  );
}

// ─── Wrapper with API key + error boundary ───
export function StoresGoogleMap(props: StoresGoogleMapProps) {
  const { apiKey, loading, error } = useGoogleMapsApiKey();
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => {
    setRetryKey((key) => key + 1);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-xl gap-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
        <p className="text-muted-foreground text-sm">Google Maps wird vorbereitet...</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted rounded-xl gap-3 p-6">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground text-sm text-center">
          {error || 'Google Maps API Key nicht konfiguriert'}
        </p>
      </div>
    );
  }

  return (
    <MapErrorBoundary key={retryKey} onRetry={handleRetry}>
      <StoresGoogleMapContent {...props} apiKey={apiKey} onRetry={handleRetry} />
    </MapErrorBoundary>
  );
}
