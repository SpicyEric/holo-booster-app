import { useEffect, useState, useCallback } from 'react';
import { AdminTopNav } from '@/components/AdminTopNav';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin, X, Save, Navigation } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

interface Customer {
  id: string;
  name: string;
  company_name: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBZMmrGWon1J1LJDeZ2HgKMF6sd9D2jJ6Q';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 48.137154,
  lng: 11.576124,
};

export default function CustomerMap() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [newPosition, setNewPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, company_name, street, house_number, postal_code, city, latitude, longitude')
        .eq('active', true);

      if (error) {
        toast.error('Fehler beim Laden der Kunden');
        console.error(error);
      } else {
        setCustomers(data || []);
      }
      setLoading(false);
    };

    fetchCustomers();
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (isRepositioning && selectedCustomer && e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setNewPosition({ lat, lng });
    }
  }, [isRepositioning, selectedCustomer]);

  const handleStartRepositioning = () => {
    setIsRepositioning(true);
    setNewPosition(null);
    toast.info('Klicke auf die Karte, um die neue Position zu setzen');
  };

  const handleSavePosition = async () => {
    if (!selectedCustomer || !newPosition) return;

    const { error } = await supabase
      .from('customers')
      .update({
        latitude: newPosition.lat,
        longitude: newPosition.lng,
      })
      .eq('id', selectedCustomer.id);

    if (error) {
      toast.error('Fehler beim Speichern der Position');
      console.error(error);
    } else {
      toast.success('Position erfolgreich gespeichert');
      
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? { ...c, latitude: newPosition.lat, longitude: newPosition.lng }
            : c
        )
      );
      
      setSelectedCustomer((prev) =>
        prev ? { ...prev, latitude: newPosition.lat, longitude: newPosition.lng } : null
      );
      
      setIsRepositioning(false);
      setNewPosition(null);
    }
  };

  const handleCancelRepositioning = () => {
    setIsRepositioning(false);
    setNewPosition(null);
  };

  const handleFlyToCustomer = (customer: Customer) => {
    if (customer.latitude && customer.longitude && map) {
      map.panTo({ lat: customer.latitude, lng: customer.longitude });
      map.setZoom(15);
    }
  };

  const handleMarkerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsRepositioning(false);
    setNewPosition(null);
  };

  const getFullAddress = (customer: Customer) => {
    const parts = [
      customer.street,
      customer.house_number,
      customer.postal_code,
      customer.city,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Keine Adresse';
  };

  const customersWithCoords = customers.filter((c) => c.latitude && c.longitude);
  const customersWithoutCoords = customers.filter((c) => !c.latitude || !c.longitude);

  if (loadError) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-background">
          <AdminTopNav />
          <div className="p-6">
            <div className="bg-card border rounded-lg p-8 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Fehler beim Laden von Google Maps</h2>
              <p className="text-muted-foreground">
                Bitte überprüfe den Google Maps API-Schlüssel.
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-background">
          <AdminTopNav />
          <div className="p-6">
            <div className="bg-card border rounded-lg p-8 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Google Maps API-Schlüssel fehlt</h2>
              <p className="text-muted-foreground">
                Bitte füge VITE_GOOGLE_MAPS_API_KEY zu den Umgebungsvariablen hinzu.
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <AdminTopNav />
        
        <div className="flex h-[calc(100vh-64px)]">
          {/* Sidebar */}
          <div className="w-80 border-r bg-background overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Kunden auf der Karte</h2>
              <p className="text-sm text-muted-foreground">
                {customersWithCoords.length} mit Position, {customersWithoutCoords.length} ohne
              </p>
            </div>

            {/* Selected Customer Detail */}
            {selectedCustomer && (
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{selectedCustomer.company_name || selectedCustomer.name}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setSelectedCustomer(null);
                      handleCancelRepositioning();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {getFullAddress(selectedCustomer)}
                </p>
                
                {selectedCustomer.latitude && selectedCustomer.longitude && (
                  <p className="text-xs text-muted-foreground mb-3 font-mono">
                    {selectedCustomer.latitude.toFixed(6)}, {selectedCustomer.longitude.toFixed(6)}
                  </p>
                )}

                {isRepositioning ? (
                  <div className="space-y-2">
                    {newPosition && (
                      <p className="text-xs text-green-600 font-mono mb-2">
                        Neue Position: {newPosition.lat.toFixed(6)}, {newPosition.lng.toFixed(6)}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSavePosition}
                        disabled={!newPosition}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Speichern
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelRepositioning}
                        className="flex-1"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleStartRepositioning}
                      className="flex-1"
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Neu platzieren
                    </Button>
                    {selectedCustomer.latitude && selectedCustomer.longitude && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFlyToCustomer(selectedCustomer)}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Customers without coordinates */}
            {customersWithoutCoords.length > 0 && (
              <div className="p-4 border-b">
                <h4 className="text-sm font-medium text-orange-600 mb-2">
                  ⚠️ Ohne Koordinaten ({customersWithoutCoords.length})
                </h4>
                <div className="space-y-1">
                  {customersWithoutCoords.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        handleCancelRepositioning();
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
                        selectedCustomer?.id === customer.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="font-medium truncate">
                        {customer.company_name || customer.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {getFullAddress(customer)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customers with coordinates */}
            <div className="p-4">
              <h4 className="text-sm font-medium text-green-600 mb-2">
                ✓ Mit Koordinaten ({customersWithCoords.length})
              </h4>
              <div className="space-y-1">
                {customersWithCoords.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      handleFlyToCustomer(customer);
                      handleCancelRepositioning();
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
                      selectedCustomer?.id === customer.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="font-medium truncate">
                      {customer.company_name || customer.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {customer.city || 'Keine Stadt'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={10}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={handleMapClick}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                }}
              >
                {/* Customer markers */}
                {customersWithCoords.map((customer) => (
                  <Marker
                    key={customer.id}
                    position={{ lat: customer.latitude!, lng: customer.longitude! }}
                    onClick={() => handleMarkerClick(customer)}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 12,
                      fillColor: selectedCustomer?.id === customer.id ? '#22c55e' : '#6366f1',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 3,
                    }}
                  />
                ))}

                {/* New position marker */}
                {newPosition && (
                  <Marker
                    position={newPosition}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 14,
                      fillColor: '#22c55e',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 3,
                    }}
                  />
                )}
              </GoogleMap>
            ) : (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {isRepositioning && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-sm font-medium">
                Klicke auf die Karte um "{selectedCustomer?.company_name || selectedCustomer?.name}" zu platzieren
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
