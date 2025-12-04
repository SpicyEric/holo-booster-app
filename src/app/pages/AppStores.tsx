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
import MerchantCard from '@/app/components/MerchantCard';

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
                <MerchantCard key={store.id} store={store} />
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
