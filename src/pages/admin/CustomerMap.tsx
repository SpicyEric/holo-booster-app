import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { MapPin, X, Save, Navigation, Search, Store, Users, Loader2 } from 'lucide-react';
import { GoogleMap, useJsApiLoader, OverlayView, Circle } from '@react-google-maps/api';

const LIBRARIES: ('places')[] = ['places'];

interface Customer {
  id: string;
  name: string;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  industry: string | null;
}

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  types: string[];
  category: string;
  rating?: number;
  user_ratings_total?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 48.137154,
  lng: 11.576124,
};

const PLACE_CATEGORIES = [
  { id: 'bakery', label: 'Bäckerei', googleType: 'bakery', color: '#d97706' },
  { id: 'cafe', label: 'Café', googleType: 'cafe', color: '#92400e' },
  { id: 'restaurant', label: 'Restaurant', googleType: 'restaurant', color: '#dc2626' },
  { id: 'hairdresser', label: 'Friseur / Barber', googleType: 'hair_care', color: '#7c3aed' },
  { id: 'beauty', label: 'Kosmetik / Beauty', googleType: 'beauty_salon', color: '#ec4899' },
  { id: 'pharmacy', label: 'Apotheke', googleType: 'pharmacy', color: '#16a34a' },
  { id: 'fuel', label: 'Tankstelle', googleType: 'gas_station', color: '#475569' },
  { id: 'fitness', label: 'Fitnessstudio', googleType: 'gym', color: '#0891b2' },
  { id: 'florist', label: 'Blumenladen', googleType: 'florist', color: '#e11d48' },
  { id: 'books', label: 'Buchhandlung', googleType: 'book_store', color: '#854d0e' },
  { id: 'pet', label: 'Tierhandlung', googleType: 'pet_store', color: '#65a30d' },
  { id: 'laundry', label: 'Waschsalon', googleType: 'laundry', color: '#0284c7' },
  { id: 'convenience', label: 'Kiosk / Laden', googleType: 'convenience_store', color: '#6366f1' },
  { id: 'tattoo', label: 'Tattoostudio', googleType: 'store', keyword: 'Tattoo', color: '#1e1b4b' },
  { id: 'ice_cream', label: 'Eisdiele', googleType: 'store', keyword: 'Eisdiele', color: '#f472b6' },
];

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
  const borderColor = '#6d28d9';
  
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

// Place marker for Store Finder
const PlaceMarker = ({
  place,
  isSelected,
  onClick,
  color,
}: {
  place: PlaceResult;
  isSelected: boolean;
  onClick: () => void;
  color: string;
}) => {
  const size = isSelected ? 36 : 28;
  return (
    <div
      onClick={onClick}
      className="cursor-pointer transform transition-transform hover:scale-125"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
    >
      <div
        className="rounded-full flex items-center justify-center text-white font-bold shadow-lg"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          border: isSelected ? '3px solid white' : '2px solid white',
          boxShadow: isSelected ? `0 0 0 3px ${color}40` : '0 2px 6px rgba(0,0,0,0.3)',
          fontSize: size * 0.35,
        }}
      >
        {place.name.charAt(0).toUpperCase()}
      </div>
    </div>
  );
};

function CustomerMapContent({ googleMapsApiKey }: { googleMapsApiKey: string }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [newPosition, setNewPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Store Finder state
  const [activeTab, setActiveTab] = useState<'customers' | 'finder'>('customers');
  const [plz, setPlz] = useState('');
  const [radius, setRadius] = useState(5); // km
  const [searchMode, setSearchMode] = useState<'plz' | 'pin'>('plz');
  const [isSelectingSearchPin, setIsSelectingSearchPin] = useState(false);
  const [activeCategories, setActiveCategories] = useState<string[]>(
    PLACE_CATEGORIES.map((c) => c.id)
  );
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: LIBRARIES,
  });

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, street, house_number, postal_code, city, latitude, longitude, logo_url, industry');

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

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    geocoderRef.current = new google.maps.Geocoder();
    placesServiceRef.current = new google.maps.places.PlacesService(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const clickedPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };

    if (isRepositioning && selectedCustomer) {
      setNewPosition(clickedPoint);
      return;
    }

    if (activeTab === 'finder' && searchMode === 'pin' && isSelectingSearchPin) {
      setSearchCenter(clickedPoint);
      setIsSelectingSearchPin(false);
      setSelectedPlace(null);
      toast.success('Pin gesetzt – jetzt Suche starten');
    }
  }, [isRepositioning, selectedCustomer, activeTab, searchMode, isSelectingSearchPin]);

  // --- Customer mode handlers ---
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
    const streetWithNumber = customer.street 
      ? `${customer.street} ${customer.house_number || ''}`.trim()
      : null;
    const parts = [streetWithNumber, customer.postal_code, customer.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Keine Adresse';
  };

  // --- Store Finder handlers ---
  const toggleCategory = (catId: string) => {
    setActiveCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleSearch = async () => {
    const categoriesToSearch = PLACE_CATEGORIES.filter((c) => activeCategories.includes(c.id));
    if (categoriesToSearch.length === 0) {
      toast.info('Bitte mindestens eine Kategorie auswählen');
      return;
    }

    if (!placesServiceRef.current) {
      toast.error('Google Maps ist noch nicht bereit, bitte kurz warten');
      return;
    }

    let center: { lat: number; lng: number };

    if (searchMode === 'pin') {
      if (!searchCenter) {
        toast.error('Bitte zuerst einen Pin auf der Karte setzen');
        return;
      }
      center = searchCenter;
    } else {
      const normalizedPlz = plz.trim();
      if (!normalizedPlz) return;

      if (!/^\d{5}$/.test(normalizedPlz)) {
        toast.error('Bitte eine gültige 5-stellige PLZ eingeben');
        return;
      }

      if (!geocoderRef.current) {
        toast.error('Google Maps ist noch nicht bereit, bitte kurz warten');
        return;
      }

      try {
        center = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          geocoderRef.current?.geocode(
            {
              address: `${normalizedPlz}, Deutschland`,
              componentRestrictions: { country: 'DE' },
            },
            (results, status) => {
              if (status !== google.maps.GeocoderStatus.OK || !results?.[0]?.geometry?.location) {
                reject(new Error('PLZ_NOT_FOUND'));
                return;
              }

              const location = results[0].geometry.location;
              resolve({ lat: location.lat(), lng: location.lng() });
            }
          );
        });
      } catch {
        toast.error('PLZ konnte nicht gefunden werden');
        return;
      }
    }

    setSearching(true);
    setPlaces([]);
    setSelectedPlace(null);
    setSearchCenter(center);

    try {
      if (map) {
        map.panTo(center);
        const zoomForRadius = radius <= 3 ? 13 : radius <= 7 ? 12 : radius <= 10 ? 11 : 10;
        map.setZoom(zoomForRadius);
      }

      const radiusMeters = radius * 1000;
      const failedStatuses = new Set<string>();
      const collectedPlaces: PlaceResult[] = [];

      for (const category of categoriesToSearch) {
        const categoryResults = await new Promise<PlaceResult[]>((resolve) => {
          const runSearch = (attempt = 0) => {
            placesServiceRef.current?.nearbySearch(
              {
                location: center,
                radius: radiusMeters,
                type: category.googleType as any,
                keyword: category.keyword,
              },
              (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                  resolve([]);
                  return;
                }

                if (
                  status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT &&
                  attempt < 2
                ) {
                  setTimeout(() => runSearch(attempt + 1), 350 * (attempt + 1));
                  return;
                }

                if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
                  failedStatuses.add(String(status));
                  console.warn(`[StoreFinder] Kategorie ${category.id} lieferte Status:`, status);
                  resolve([]);
                  return;
                }

                const mapped = results
                  .filter((place) => place.place_id && place.geometry?.location)
                  .map((place) => ({
                    place_id: place.place_id as string,
                    name: place.name || 'Unbekannt',
                    vicinity: place.vicinity || '',
                    lat: place.geometry!.location!.lat(),
                    lng: place.geometry!.location!.lng(),
                    types: place.types || [],
                    category: category.id,
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                  }));

                resolve(mapped);
              }
            );
          };

          runSearch();
        });

        collectedPlaces.push(...categoryResults);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      const deduped = Array.from(new Map(collectedPlaces.map((place) => [place.place_id, place])).values());
      setPlaces(deduped);

      if (deduped.length === 0) {
        if (failedStatuses.has(google.maps.places.PlacesServiceStatus.REQUEST_DENIED)) {
          toast.error('Google Places lehnt die Suche ab – bitte API-Restriktionen prüfen');
        } else if (failedStatuses.has(google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT)) {
          toast.error('Zu viele Anfragen gleichzeitig – bitte erneut suchen');
        } else {
          toast.info('Keine Geschäfte in diesem Bereich gefunden');
        }
      } else {
        toast(`${deduped.length} Geschäfte gefunden`);
      }
    } catch (error) {
      console.error('[StoreFinder] Google search error:', error);
      toast.error('Suche fehlgeschlagen – bitte erneut versuchen');
    } finally {
      setSearching(false);
    }
  };

  const getCategoryColor = (catId: string) => {
    return PLACE_CATEGORIES.find((c) => c.id === catId)?.color || '#6366f1';
  };

  const getCategoryLabel = (catId: string) => {
    return PLACE_CATEGORIES.find((c) => c.id === catId)?.label || catId;
  };

  const filteredPlaces = places.filter((p) => activeCategories.includes(p.category));

  const customersWithCoords = customers.filter((c) => c.latitude && c.longitude);
  const customersWithoutCoords = customers.filter((c) => !c.latitude || !c.longitude);

  if (loadError) {
    return (
      <div className="p-6">
        <div className="bg-card border rounded-lg p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Fehler beim Laden von Google Maps</h2>
          <p className="text-muted-foreground">Bitte überprüfe den Google Maps API-Schlüssel.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <AdminTopNav />
        
        <div className="flex h-[calc(100vh-64px)]">
          {/* Sidebar */}
          <div className="w-80 border-r bg-background overflow-y-auto flex flex-col">
            {/* Tab Switcher */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('customers')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'customers'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" />
                Geschäfte
              </button>
              <button
                onClick={() => setActiveTab('finder')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'finder'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Search className="h-4 w-4" />
                Store Finder
              </button>
            </div>

            {activeTab === 'customers' ? (
              /* ===== CUSTOMERS TAB ===== */
              <div className="flex-1 overflow-y-auto">
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
                          <Button size="sm" onClick={handleSavePosition} disabled={!newPosition} className="flex-1">
                            <Save className="h-4 w-4 mr-1" />
                            Speichern
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelRepositioning} className="flex-1">
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleStartRepositioning} className="flex-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          Neu platzieren
                        </Button>
                        {selectedCustomer.latitude && selectedCustomer.longitude && (
                          <Button size="sm" variant="outline" onClick={() => handleFlyToCustomer(selectedCustomer)}>
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
                              <img src={customer.logo_url} alt={customer.name} className="w-6 h-6 rounded-full object-cover border border-violet-700" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{customer.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{getFullAddress(customer)}</div>
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
                            <img src={customer.logo_url} alt={customer.name} className="w-6 h-6 rounded-full object-cover border border-violet-700" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{customer.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{customer.city || 'Keine Stadt'}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ===== STORE FINDER TAB ===== */
              <div className="flex-1 overflow-y-auto">
                {/* Search controls */}
                <div className="p-4 border-b space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={searchMode === 'plz' ? 'default' : 'outline'}
                      onClick={() => {
                        setSearchMode('plz');
                        setIsSelectingSearchPin(false);
                      }}
                    >
                      Postleitzahl
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={searchMode === 'pin' ? 'default' : 'outline'}
                      onClick={() => {
                        setSearchMode('pin');
                        setIsSelectingSearchPin(false);
                        setSearchCenter(null);
                        setPlaces([]);
                        setSelectedPlace(null);
                      }}
                    >
                      Pin auf Karte
                    </Button>
                  </div>

                  {searchMode === 'plz' ? (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Postleitzahl</label>
                      <Input
                        placeholder="z.B. 80331"
                        value={plz}
                        onChange={(e) => setPlz(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1"
                        maxLength={5}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Setze einen Pin auf der Karte als Suchzentrum.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={isSelectingSearchPin ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => setIsSelectingSearchPin((prev) => !prev)}
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          {isSelectingSearchPin ? 'Auf Karte klicken…' : searchCenter ? 'Pin neu setzen' : 'Pin setzen'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSearchCenter(null);
                            setPlaces([]);
                            setSelectedPlace(null);
                            setIsSelectingSearchPin(false);
                          }}
                          disabled={!searchCenter}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {searchCenter && (
                        <p className="text-xs font-mono text-muted-foreground">
                          {searchCenter.lat.toFixed(5)}, {searchCenter.lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleSearch}
                    disabled={searching || (searchMode === 'plz' ? !plz.trim() : !searchCenter)}
                    className="w-full"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Suchen
                  </Button>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Umkreis: <span className="text-primary">{radius} km</span>
                    </label>
                    <Slider
                      value={[radius]}
                      onValueChange={(v) => setRadius(v[0])}
                      min={1}
                      max={15}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Category filters */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Kategorien</label>
                    <button
                      onClick={() =>
                        setActiveCategories((prev) =>
                          prev.length === PLACE_CATEGORIES.length ? [] : PLACE_CATEGORIES.map((c) => c.id)
                        )
                      }
                      className="text-xs text-primary hover:underline"
                    >
                      {activeCategories.length === PLACE_CATEGORIES.length ? 'Keine' : 'Alle'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {PLACE_CATEGORIES.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                      >
                        <Checkbox
                          checked={activeCategories.includes(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                        />
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Results */}
                {places.length > 0 && (
                  <div className="p-4">
                    <h4 className="text-sm font-medium mb-2">
                      {filteredPlaces.length} Ergebnisse
                    </h4>
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {filteredPlaces.map((place) => (
                        <button
                          key={place.place_id}
                          onClick={() => {
                            setSelectedPlace(place);
                            map?.panTo({ lat: place.lat, lng: place.lng });
                            map?.setZoom(16);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
                            selectedPlace?.place_id === place.place_id ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: getCategoryColor(place.category) }}
                            >
                              {place.name.charAt(0)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{place.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {getCategoryLabel(place.category)} · {place.vicinity}
                              </div>
                              {place.rating && (
                                <div className="text-xs text-amber-600">
                                  ⭐ {place.rating} ({place.user_ratings_total || 0})
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                {/* Customer markers (always visible in customers tab) */}
                {activeTab === 'customers' &&
                  customersWithCoords.map((customer) => (
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

                {/* Store Finder markers + radius circle */}
                {activeTab === 'finder' && (
                  <>
                    {searchCenter && (
                      <>
                        <OverlayView
                          position={searchCenter}
                          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                          <div
                            className="w-5 h-5 rounded-full bg-primary border-2 border-background shadow-md"
                            style={{ marginLeft: -10, marginTop: -10 }}
                          />
                        </OverlayView>
                        <Circle
                          center={searchCenter}
                          radius={radius * 1000}
                          options={{
                            fillColor: '#6d28d9',
                            fillOpacity: 0.06,
                            strokeColor: '#6d28d9',
                            strokeOpacity: 0.3,
                            strokeWeight: 2,
                          }}
                        />
                      </>
                    )}
                    {filteredPlaces.map((place) => (
                      <OverlayView
                        key={place.place_id}
                        position={{ lat: place.lat, lng: place.lng }}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                      >
                        <PlaceMarker
                          place={place}
                          isSelected={selectedPlace?.place_id === place.place_id}
                          onClick={() => setSelectedPlace(place)}
                          color={getCategoryColor(place.category)}
                        />
                      </OverlayView>
                    ))}
                  </>
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

            {activeTab === 'finder' && searchMode === 'pin' && isSelectingSearchPin && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                Klicke auf die Karte, um den Such-Pin zu setzen
              </div>
            )}

            {/* Selected place info */}
            {activeTab === 'finder' && selectedPlace && (
              <div className="absolute bottom-4 left-4 right-4 max-w-sm bg-background border rounded-lg shadow-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedPlace.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedPlace.vicinity}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: getCategoryColor(selectedPlace.category) }}
                      >
                        {getCategoryLabel(selectedPlace.category)}
                      </span>
                      {selectedPlace.rating && (
                        <span className="text-xs text-amber-600">
                          ⭐ {selectedPlace.rating} ({selectedPlace.user_ratings_total || 0})
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedPlace(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function CustomerMap() {
  const { apiKey, loading, error } = useGoogleMapsApiKey();

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-background">
          <AdminTopNav />
          <div className="p-6">
            <div className="bg-card border rounded-lg p-8 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
              <h2 className="text-xl font-semibold mb-2">Google Maps wird vorbereitet</h2>
              <p className="text-muted-foreground">API-Key wird geladen...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!apiKey) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen bg-background">
          <AdminTopNav />
          <div className="p-6">
            <div className="bg-card border rounded-lg p-8 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Google Maps API Key fehlt</h2>
              <p className="text-muted-foreground">{error || 'Bitte Google Maps API Key in Lovable Cloud hinterlegen.'}</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return <CustomerMapContent googleMapsApiKey={apiKey} />;
}
