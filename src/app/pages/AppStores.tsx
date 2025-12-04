import { useEffect, useState } from 'react';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StoresGoogleMap } from '@/app/components/StoresGoogleMap';
import { Card } from '@/components/ui/card';
import { getCurrentLocation, GeolocationError } from '@/app/services/geolocationService';
import { Button } from '@/components/ui/button';
// INLINE CARD TEST - v1
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchUserLocation = async () => {
    try {
      setLocationError(null);
      const location = await getCurrentLocation();
      console.log('User location received:', location);
      setUserLocation([location.latitude, location.longitude]);
    } catch (error) {
      const geoError = error as GeolocationError;
      console.error('Location error:', geoError);
      setLocationError(geoError.message);
      // Don't set fallback - let user see error and retry
    }
  };

  useEffect(() => {
    fetchUserLocation();
  }, []);

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="map">Karte</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-3">
          {/* DEBUG: Force rebuild - v2 */}
          {stores.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">Keine Stores gefunden</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => window.location.href = `/app/merchant/${store.id}`}
                  className="w-full rounded-xl overflow-hidden shadow-md text-left relative"
                  style={{ aspectRatio: '1.55 / 1', border: '8px solid red', backgroundColor: 'yellow' }}
                >
                  <div className="absolute inset-0">
                    {store.cover_image_url ? (
                      <img src={store.cover_image_url} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500" />
                    )}
                  </div>
                  <div className="absolute top-3 left-3 z-20 w-12 h-12 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={`${store.name} Logo`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white">{store.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  {store.distance !== undefined && (
                    <div className="absolute top-3 right-3 z-20">
                      <span className="bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                        {store.distance < 1 ? `${Math.round(store.distance * 1000)}m` : `${store.distance.toFixed(1)}km`}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <h3 className="text-white font-semibold text-base truncate drop-shadow-md">{store.name}</h3>
                    {store.category && <p className="text-white/80 text-sm truncate drop-shadow-md">{store.category}</p>}
                  </div>
                </button>
              ))}
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
    </MainLayout>
  );
}

export { AppStores };
