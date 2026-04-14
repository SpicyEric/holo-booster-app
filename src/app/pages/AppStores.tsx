import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MapPin, AlertCircle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StoresGoogleMap } from '@/app/components/StoresGoogleMap';
import { Card } from '@/components/ui/card';
import { 
  getCurrentLocation, 
  GeolocationError, 
  checkLocationPermission, 
  requestLocationPermission,
  openAppSettings 
} from '@/app/services/geolocationService';
import { Button } from '@/components/ui/button';
import { LocationPermissionDialog } from '@/app/components/LocationPermissionDialog';
import { Capacitor } from '@capacitor/core';

interface Store {
  id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  lat: number;
  lng: number;
  address: string;
  points?: number;
  distance?: number;
}

export default function AppStores() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  const isNative = Capacitor.isNativePlatform();

  const fetchUserLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      // On native: First check permission status
      if (isNative) {
        const permStatus = await checkLocationPermission();
        console.log('Location permission status:', permStatus);
        
        if (permStatus.location === 'denied') {
          // Permission was previously denied - show dialog to open settings
          setShowLocationDialog(true);
          setLocationLoading(false);
          setPermissionChecked(true);
          return;
        }
        
        if (permStatus.location === 'prompt' || permStatus.location !== 'granted') {
          // First time or not granted - request permission (triggers native popup)
          console.log('Requesting location permission...');
          const result = await requestLocationPermission();
          console.log('Permission request result:', result);
          
          if (result.location !== 'granted') {
            // User denied the native prompt
            setShowLocationDialog(true);
            setLocationLoading(false);
            setPermissionChecked(true);
            return;
          }
        }
      }
      
      // Permission granted (or web) - get location
      const location = await getCurrentLocation();
      console.log('User location received:', location);
      setUserLocation([location.latitude, location.longitude]);
      setPermissionChecked(true);
    } catch (error) {
      const geoError = error as GeolocationError;
      console.error('Location error:', geoError);
      
      // Check if it's a permission error
      if (geoError.code === 'PERMISSION_DENIED') {
        setShowLocationDialog(true);
      } else {
        setLocationError(geoError.message);
      }
      setPermissionChecked(true);
    } finally {
      setLocationLoading(false);
    }
  }, [isNative]);

  const handleLocationRetry = useCallback(async () => {
    setShowLocationDialog(false);
    // Small delay to let dialog close
    setTimeout(() => {
      fetchUserLocation();
    }, 300);
  }, [fetchUserLocation]);

  const handleOpenLocationSettings = useCallback(async () => {
    await openAppSettings();
  }, []);

  useEffect(() => {
    fetchUserLocation();
  }, [fetchUserLocation]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching stores...');
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url, industry, city, street, house_number, postal_code, latitude, longitude')
          .eq('active', true);

        if (customersError) {
          console.error('Error fetching customers:', customersError);
          throw customersError;
        }

        console.log('Fetched customers:', customersData?.length, customersData);

        // Only fetch stamp cards if user is logged in
        let stampCardsData: any[] = [];
        if (user) {
          const { data, error: stampCardsError } = await supabase
            .from('user_stamp_cards')
            .select('merchant_customer_id, current_points')
            .eq('user_id', user.id);

          if (stampCardsError) {
            console.error('Error fetching stamp cards:', stampCardsError);
          } else {
            stampCardsData = data || [];
          }
        }

        const storesWithPoints = (customersData || []).map(customer => {
          const stampCard = stampCardsData?.find(sc => sc.merchant_customer_id === customer.id);
          const distance = userLocation && customer.latitude && customer.longitude
            ? calculateDistance(
                userLocation[0],
                userLocation[1],
                customer.latitude,
                customer.longitude
              )
            : undefined;

          const storeName = customer.company_name || customer.name || 'Unbekannt';
          const streetWithNumber = [customer.street, customer.house_number].filter(Boolean).join(' ');

          return {
            id: customer.id,
            name: storeName,
            category: customer.industry || null,
            logo_url: customer.logo_url,
            cover_image_url: customer.cover_image_url,
            lat: customer.latitude || 0,
            lng: customer.longitude || 0,
            address: [streetWithNumber, customer.postal_code, customer.city].filter(Boolean).join(', '),
            points: stampCard?.current_points ?? 0,
            distance: distance !== undefined ? Math.round(distance * 10) / 10 : undefined,
          };
        });

        console.log('Stores with coordinates:', storesWithPoints.filter(s => s.lat !== 0 && s.lng !== 0));

        // Show all stores in list, sort by distance (stores without coords at the end)
        const nearbyStores = storesWithPoints
          .sort((a, b) => (a.distance || 999) - (b.distance || 999));
        
        setStores(nearbyStores);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };


  if (loading) {
    return (
      <MainLayout title="Stores">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Stores">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-0 z-10 bg-background pb-3 pt-1">
          <div className="rounded-xl border border-border/50 bg-background/85 p-1 shadow-lg backdrop-blur-xl">
            <div className="relative grid w-full grid-cols-2 gap-1">
              {(['list', 'map'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative z-10 rounded-lg py-2.5 text-sm transition-colors duration-200 ${
                    activeTab === tab ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {tab === 'list' ? 'Liste' : 'Karte'}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="stores-tab-indicator"
                      className="absolute inset-0 rounded-lg bg-foreground/10 shadow-md border border-border/60"
                      style={{ zIndex: -1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <TabsContent value="list" className="mt-4" style={{ overflow: 'visible' }}>
          {/* DEBUG: Force rebuild - v2 */}
          {stores.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">Keine Stores gefunden</p>
            </Card>
          ) : (
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{ paddingBottom: '8rem' }}
            >
              {stores.map((store, index) => {
                const cardHeight = 200;
                const cardOffset = index * cardHeight;
                const distanceScrolled = Math.max(0, scrollY - cardOffset);
                const stackScale = Math.max(0.85, 1 - index * 0.03);
                const translateY = Math.min(0, -distanceScrolled * 0.3);

                return (
                  <div
                    key={store.id}
                    style={{
                      transform: `scale(${stackScale}) translateY(${translateY}px)`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.1s ease-out',
                      zIndex: stores.length - index,
                      marginBottom: '12px',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        navigate(`/app/merchant/${store.id}`, {
                          state: {
                            fromStores: true,
                            sourceRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                            initialMerchant: {
                              id: store.id,
                              name: store.name,
                              company_name: store.name,
                              cover_image_url: store.cover_image_url,
                              logo_url: store.logo_url,
                              description: null,
                              city: null,
                              street: null,
                              house_number: null,
                              postal_code: null,
                              phone: null,
                              website: null,
                              instagram: null,
                              opening_hours: null,
                              google_review_url: null,
                              latitude: store.lat,
                              longitude: store.lng,
                            },
                          },
                        });
                      }}
                      className="w-full rounded-xl overflow-hidden shadow-md text-left relative block"
                      style={{ aspectRatio: '1.55 / 1', display: 'block' }}
                    >
                      <div className="absolute inset-0">
                        {store.cover_image_url ? (
                          <img src={store.cover_image_url} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500" />
                        )}
                      </div>
                      <div className="absolute top-3 left-3 z-20 w-12 h-12 rounded-full bg-primary border-2 border-card shadow-lg flex items-center justify-center overflow-hidden">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={`${store.name} Logo`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-white">{store.name?.charAt(0)?.toUpperCase() || '?'}</span>
                        )}
                      </div>
                      {store.distance !== undefined && (
                        <div className="absolute top-3 right-3 z-20">
                          <span className="bg-card/95 backdrop-blur-sm text-foreground text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                            {store.distance < 1 ? `${Math.round(store.distance * 1000)}m` : `${store.distance.toFixed(1)}km`}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 z-10">
                        <h3 className="text-white font-semibold text-xl truncate drop-shadow-md">{store.name}</h3>
                        {store.category && <p className="text-white/80 text-sm truncate drop-shadow-md">{store.category}</p>}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          {locationError ? (
            <Card className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-muted-foreground mb-4">{locationError}</p>
              <Button onClick={fetchUserLocation} variant="outline">
                Erneut versuchen
              </Button>
            </Card>
          ) : userLocation ? (
            <div className="h-[calc(100vh-16rem)] rounded-xl overflow-hidden">
              <StoresGoogleMap stores={stores} userLocation={userLocation} />
            </div>
          ) : locationLoading ? (
            <Card className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
              <p className="text-muted-foreground">Lade Standort...</p>
            </Card>
          ) : permissionChecked && !userLocation ? (
            <Card className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-2">Standortzugriff benötigt</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Um die Karte anzuzeigen, benötigen wir Zugriff auf deinen Standort.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => setShowLocationDialog(true)}>
                  <MapPin className="mr-2 h-4 w-4" />
                  Standort erlauben
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Lade Standort...</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Location Permission Dialog */}
      <LocationPermissionDialog
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        onRetry={handleLocationRetry}
        onOpenSettings={handleOpenLocationSettings}
      />
    </MainLayout>
  );
}

export { AppStores };
