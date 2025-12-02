import { useEffect, useState, useCallback } from 'react';
import { AdminTopNav } from '@/components/AdminTopNav';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin, X, Save, Navigation } from 'lucide-react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';

interface Customer {
  id: string;
  name: string;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  industry: string | null;
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

// Custom marker component with logo
const CustomMarker = ({ 
  customer, 
  isSelected, 
  onClick 
}: { 
  customer: Customer; 
  isSelected: boolean; 
  onClick: () => void;
}) => {
  const size = isSelected ? 56 : 48;
  const borderColor = '#6d28d9'; // dark purple (violet-700)
  
  return (
    <div
      onClick={onClick}
      className="cursor-pointer transform transition-transform hover:scale-110"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
    >
      <div
        className="rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: size,
          height: size,
          border: `3px solid ${borderColor}`,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          boxShadow: isSelected ? '0 0 0 3px rgba(109, 40, 217, 0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {customer.logo_url ? (
          <img
            src={customer.logo_url}
            alt={customer.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: borderColor }}
          >
            {customer.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
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

  // Fetch customers from Lovable Cloud
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, street, postal_code, city, latitude, longitude, logo_url, industry');

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
      customer.postal_code,
      customer.city,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Keine Adresse';
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
                  <div className="flex items-center gap-2">
                    {selectedCustomer.logo_url && (
                      <img
                        src={selectedCustomer.logo_url}
                        alt={selectedCustomer.name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-violet-700"
                      />
                    )}
                    <h3 className="font-medium">{selectedCustomer.name}</h3>
                  </div>
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
                {selectedCustomer.industry && (
                  <p className="text-xs text-violet-600 mb-1">{selectedCustomer.industry}</p>
                )}
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
                      <div className="flex items-center gap-2">
                        {customer.logo_url ? (
                          <img
                            src={customer.logo_url}
                            alt={customer.name}
                            className="w-6 h-6 rounded-full object-cover border border-violet-700"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {customer.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {getFullAddress(customer)}
                          </div>
                        </div>
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
                    <div className="flex items-center gap-2">
                      {customer.logo_url ? (
                        <img
                          src={customer.logo_url}
                          alt={customer.name}
                          className="w-6 h-6 rounded-full object-cover border border-violet-700"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {customer.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {customer.city || 'Keine Stadt'}
                        </div>
                      </div>
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
                {/* Custom customer markers with logos */}
                {customersWithCoords.map((customer) => (
                  <OverlayView
                    key={customer.id}
                    position={{ lat: customer.latitude!, lng: customer.longitude! }}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <CustomMarker
                      customer={customer}
                      isSelected={selectedCustomer?.id === customer.id}
                      onClick={() => handleMarkerClick(customer)}
                    />
                  </OverlayView>
                ))}

                {/* New position marker */}
                {newPosition && (
                  <OverlayView
                    position={newPosition}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        marginLeft: -12,
                        marginTop: -12,
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        border: '3px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    />
                  </OverlayView>
                )}
              </GoogleMap>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Karte wird geladen...</div>
              </div>
            )}

            {/* Repositioning overlay */}
            {isRepositioning && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                Klicke auf die Karte um die neue Position zu setzen
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
