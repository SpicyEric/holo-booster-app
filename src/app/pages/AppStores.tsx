import { useEffect, useState } from 'react';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StoresGoogleMap } from '@/app/components/StoresGoogleMap';
import { Card } from '@/components/ui/card';

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
  const navigate = useNavigate();

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation([52.520008, 13.404954]); // Berlin fallback
        }
      );
    } else {
      setUserLocation([52.520008, 13.404954]);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url, industry, city, street, house_number, postal_code, latitude, longitude')
          .eq('active', true);

        if (customersError) throw customersError;

        const { data: stampCardsData, error: stampCardsError } = await supabase
          .from('user_stamp_cards')
          .select('merchant_customer_id, current_points')
          .eq('user_id', user.id);

        if (stampCardsError) {
          console.error('Error fetching stamp cards:', stampCardsError);
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

  const StoreCard = ({ store }: { store: Store }) => (
    <button
      onClick={() => navigate(`/app/merchant/${store.id}`)}
      className="w-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow text-left relative h-28"
    >
      {/* Background - Cover Image or Gradient */}
      <div className="absolute inset-0">
        {store.cover_image_url ? (
          <img
            src={store.cover_image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/80 to-secondary/80" />
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-4 h-full flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/30">
          {store.logo_url ? (
            <img
              src={store.logo_url}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-white">
              {store.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white flex items-center gap-2 truncate">
            {store.name}
            {store.points && store.points > 0 && (
              <Heart className="h-4 w-4 fill-pink-400 text-pink-400 flex-shrink-0" />
            )}
          </h3>
          {store.category && (
            <p className="text-sm text-white/70 capitalize">{store.category}</p>
          )}
        </div>
        
        {/* Distance Badge - Top Right */}
        {store.distance !== undefined && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-xs font-semibold text-primary">{store.distance} km</span>
          </div>
        )}
      </div>
    </button>
  );

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
          {stores.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">Keine Stores gefunden</p>
            </Card>
          ) : (
            stores.map((store) => <StoreCard key={store.id} store={store} />)
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          {userLocation ? (
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
