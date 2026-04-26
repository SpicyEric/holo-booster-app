import { useEffect, useState, useCallback, useMemo, Component, type ReactNode } from 'react';
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
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6 bg-muted rounded-xl">
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
            <RefreshCw className="h-4 w-4 mr-2" /> Erneut versuchen
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function StoresGoogleMapContent({
  userLocation,
  stores,
  apiKey,
  onRetry,
}: StoresGoogleMapProps & { apiKey: string; onRetry: () => void }) {
  const navigate = useNavigate();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [markerIcons, setMarkerIcons] = useState<Record<string, google.maps.Icon>>({});
  const [authError, setAuthError] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const validStores = useMemo(() => stores.filter((store) => store.lat !== 0 && store.lng !== 0), [stores]);
  const center = useMemo(() => ({ lat: userLocation[0], lng: userLocation[1] }), [userLocation]);

  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      mapInstance.setCenter(center);
      mapInstance.setZoom(14);
    },
    [center]
  );

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    const win = window as typeof window & { gm_authFailure?: () => void };
    const previousAuthFailure = win.gm_authFailure;

    win.gm_authFailure = () => {
      console.error('[GoogleMap] gm_authFailure triggered');
      setAuthError(true);
    };

    return () => {
      win.gm_authFailure = previousAuthFailure;
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || typeof google === 'undefined') return;

    let cancelled = false;

    const storesWithLogo = validStores.filter((store) => Boolean(store.logo_url));

    if (storesWithLogo.length === 0) {
      setMarkerIcons((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    setMarkerIcons({});

    storesWithLogo.forEach((store) => {
      const logoUrl = store.logo_url;
      if (!logoUrl) return;

      const canvas = document.createElement('canvas');
      const size = 88;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (cancelled) return;

        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, 0, 0, size, size);
          ctx.restore();

          const icon: google.maps.Icon = {
            url: canvas.toDataURL(),
            scaledSize: new google.maps.Size(56, 56),
            anchor: new google.maps.Point(28, 28),
          };

          setMarkerIcons((prev) => {
            const currentIcon = prev[store.id];
            if (currentIcon?.url === icon.url) {
              return prev;
            }
            return { ...prev, [store.id]: icon };
          });
        } catch (error) {
          console.warn('[GoogleMap] Marker icon render failed, using fallback icon:', error);
        }
      };

      img.onerror = () => {
        if (!cancelled) {
          console.warn(`[GoogleMap] Logo could not be loaded for store ${store.id}`);
        }
      };

      img.src = logoUrl;
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, validStores]);

  if (loadError || authError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 bg-muted rounded-xl">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground text-sm text-center">
          Google Maps konnte nicht geladen werden.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" /> Erneut versuchen
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
    <div className="w-full h-full">
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
                scale: 18,
              }
            }
          />
        ))}

        {selectedStore && (
          <InfoWindow
            position={{ lat: selectedStore.lat, lng: selectedStore.lng }}
            onCloseClick={() => setSelectedStore(null)}
            options={{ pixelOffset: new google.maps.Size(0, -28) }}
          >
            <div className="min-w-[200px] px-1 py-1">
              <h3 className="font-semibold text-foreground text-base leading-tight">
                {selectedStore.name}
              </h3>
              {typeof selectedStore.distance === 'number' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedStore.distance.toFixed(1).replace('.', ',')} km entfernt
                </p>
              )}
              <button
                onClick={() => navigate(`/app/merchant/${selectedStore.id}`)}
                className="w-full mt-3 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
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

export function StoresGoogleMap(props: StoresGoogleMapProps) {
  const { apiKey, loading, error } = useGoogleMapsApiKey();
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => {
    setRetryKey((prev) => prev + 1);
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
