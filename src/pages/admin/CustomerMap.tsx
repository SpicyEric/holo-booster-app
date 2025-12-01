import { useEffect, useRef, useState } from 'react';
import { AdminTopNav } from '@/components/AdminTopNav';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { MapPin, X, Save, Navigation } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function CustomerMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [tempMarker, setTempMarker] = useState<mapboxgl.Marker | null>(null);
  const [newPosition, setNewPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [11.576124, 48.137154], // Munich center
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Handle map click for repositioning
    map.current.on('click', (e) => {
      if (isRepositioning && selectedCustomer) {
        const { lat, lng } = e.lngLat;
        setNewPosition({ lat, lng });

        // Remove old temp marker
        if (tempMarker) {
          tempMarker.remove();
        }

        // Add new temp marker
        const marker = new mapboxgl.Marker({ color: '#22c55e' })
          .setLngLat([lng, lat])
          .addTo(map.current!);
        setTempMarker(marker);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [MAPBOX_TOKEN]);

  // Handle repositioning state change
  useEffect(() => {
    if (map.current) {
      map.current.getCanvas().style.cursor = isRepositioning ? 'crosshair' : '';
    }
  }, [isRepositioning]);

  // Add markers for customers
  useEffect(() => {
    if (!map.current || loading) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add markers for customers with coordinates
    customers.forEach((customer) => {
      if (customer.latitude && customer.longitude) {
        const el = document.createElement('div');
        el.className = 'customer-marker';
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([customer.longitude, customer.latitude])
          .addTo(map.current!);

        el.addEventListener('click', () => {
          setSelectedCustomer(customer);
          setIsRepositioning(false);
          setNewPosition(null);
          if (tempMarker) {
            tempMarker.remove();
            setTempMarker(null);
          }
        });

        markersRef.current.set(customer.id, marker);
      }
    });
  }, [customers, loading]);

  const handleStartRepositioning = () => {
    setIsRepositioning(true);
    setNewPosition(null);
    if (tempMarker) {
      tempMarker.remove();
      setTempMarker(null);
    }
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
      
      // Update local state
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
      if (tempMarker) {
        tempMarker.remove();
        setTempMarker(null);
      }
    }
  };

  const handleCancelRepositioning = () => {
    setIsRepositioning(false);
    setNewPosition(null);
    if (tempMarker) {
      tempMarker.remove();
      setTempMarker(null);
    }
  };

  const handleFlyToCustomer = (customer: Customer) => {
    if (customer.latitude && customer.longitude && map.current) {
      map.current.flyTo({
        center: [customer.longitude, customer.latitude],
        zoom: 15,
        duration: 1500,
      });
    }
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

  if (!MAPBOX_TOKEN) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-background">
          <AdminTopNav />
          <div className="p-6">
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Mapbox Token fehlt</h2>
                <p className="text-muted-foreground">
                  Bitte füge VITE_MAPBOX_TOKEN zu den Umgebungsvariablen hinzu.
                </p>
              </CardContent>
            </Card>
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
            <div ref={mapContainer} className="absolute inset-0" />
            
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