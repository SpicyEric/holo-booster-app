import { useCallback, useEffect, useState, createContext, useContext } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Store, Gift, MessageSquare, Mail, Bell, MapPin, Search, User, History, LogOut, Shield, FileText, HelpCircle, ChevronRight, Sparkles, AlertCircle, TrendingUp, Trophy, Loader2 } from 'lucide-react';
import { StoresGoogleMap } from '@/app/components/StoresGoogleMap';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TopBar } from './layout/TopBar';
import { BottomNav } from './layout/BottomNav';
import Particles from '@/components/Particles';
import { getCurrentLocation } from '@/app/services/geolocationService';
import { toast } from 'sonner';
import { usePushNotifications } from '@/app/hooks/usePushNotifications';
import { useMessageNotifications } from '@/app/hooks/useMessageNotifications';
import { useBackButton } from '@/app/hooks/useBackButton';
import { ExitAppDialog } from '@/app/components/ExitAppDialog';
import { useStatusBar } from '@/app/hooks/useStatusBar';

// Context to control swipe behavior
const SwipeControlContext = createContext<{
  setSwipeEnabled: (enabled: boolean) => void;
}>({ setSwipeEnabled: () => {} });

export const useSwipeControl = () => useContext(SwipeControlContext);

// Map route paths to carousel indices
const ROUTE_TO_INDEX: Record<string, number> = {
  '/app': 0,
  '/app/messages': 1,
  '/app/stores': 2,
  '/app/profile': 3,
};

const INDEX_TO_ROUTE: Record<number, string> = {
  0: '/app',
  1: '/app/messages',
  2: '/app/stores',
  3: '/app/profile',
};

const INDEX_TO_TITLE: Record<number, string> = {
  0: 'Start',
  1: 'Nachrichten',
  2: 'Stores',
  3: 'Einstellungen',
};

export const SwipeableAppContainer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  
  // Initialize push notifications
  usePushNotifications();
  
  // Listen for new messages and trigger push notifications
  useMessageNotifications();
  
  // Handle back button on native platforms
  const { showExitDialog, confirmExit, cancelExit } = useBackButton();
  useStatusBar();
  
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
    dragFree: false,
    watchDrag: swipeEnabled,
  });

  // Re-initialize embla when swipe enabled state changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit({ watchDrag: swipeEnabled });
    }
  }, [emblaApi, swipeEnabled]);

  // Sync carousel with current route on mount and route changes
  useEffect(() => {
    const targetIndex = ROUTE_TO_INDEX[location.pathname];
    if (targetIndex !== undefined && emblaApi) {
      emblaApi.scrollTo(targetIndex, false);
      setCurrentIndex(targetIndex);
    }
  }, [location.pathname, emblaApi]);

  // Handle carousel slide changes
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setCurrentIndex(index);
    
    const targetRoute = INDEX_TO_ROUTE[index];
    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute, { replace: true });
    }
  }, [emblaApi, navigate, location.pathname]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollToIndex = useCallback((index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
    }
  }, [emblaApi]);

  return (
    <SwipeControlContext.Provider value={{ setSwipeEnabled }}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20 pt-14 overflow-hidden">
        <Particles
          particleColors={['#6366F1', '#8B5CF6', '#A855F7']}
          particleCount={400}
          particleSpread={10}
          speed={0.03}
          particleBaseSize={120}
          sizeRandomness={1.8}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
          cameraDistance={20}
        />
        
        <TopBar title={INDEX_TO_TITLE[currentIndex]} />
        
        <div className="overflow-hidden h-[calc(100vh-136px)]" ref={emblaRef}>
          <div className="flex h-full">
            <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto">
              <div className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
                <AppHomeContent />
              </div>
            </div>
            
            <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto">
              <div className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
                <AppMessagesContent />
              </div>
            </div>
            
            <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto" style={{ touchAction: 'pan-y' }}>
              <div className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
                <AppStoresContent />
              </div>
            </div>
            
            <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto">
              <div className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
                <AppProfileContent />
              </div>
            </div>
          </div>
        </div>
        
        <BottomNav onNavigate={scrollToIndex} currentIndex={currentIndex} />
        
        {/* Exit App Dialog for Android back button */}
        <ExitAppDialog 
          open={showExitDialog} 
          onConfirm={confirmExit} 
          onCancel={cancelExit} 
        />
      </div>
    </SwipeControlContext.Provider>
  );
};

// Home Content
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AppHomeContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loyaltyEntries, setLoyaltyEntries] = useState<any[]>([]);
  const [newCustomerOffers, setNewCustomerOffers] = useState<any[]>([]);
  const [redeemableRewards, setRedeemableRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => console.log('[AppHome] Geolocation denied'),
      { timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, userLocation]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('id, merchant_customer_id, current_points_balance')
        .eq('user_id', user!.id)
        .gt('current_points_balance', 0);

      let stampedMerchantIds: string[] = [];
      const pointsMap = new Map<string, number>();

      if (accounts && accounts.length > 0) {
        stampedMerchantIds = accounts.map(a => a.merchant_customer_id);
        accounts.forEach(a => pointsMap.set(a.merchant_customer_id, a.current_points_balance || 0));

        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, industry, stamps_required')
          .in('id', stampedMerchantIds);

        setLoyaltyEntries(accounts.map(account => ({
          id: account.id,
          merchant_customer_id: account.merchant_customer_id,
          current_points: account.current_points_balance || 0,
          customer: customersData?.find(c => c.id === account.merchant_customer_id),
        })));

        const { data: rewardsData } = await supabase
          .from('rewards')
          .select('id, title, points_required, merchant_customer_id')
          .eq('is_active', true)
          .in('merchant_customer_id', stampedMerchantIds);

        if (rewardsData) {
          const redeemable = rewardsData
            .filter(r => (pointsMap.get(r.merchant_customer_id) || 0) >= r.points_required)
            .map(r => {
              const c = customersData?.find(c => c.id === r.merchant_customer_id);
              return { ...r, merchantName: c?.company_name || c?.name || 'Unbekannt', merchantLogo: c?.logo_url || null, userPoints: pointsMap.get(r.merchant_customer_id) || 0 };
            });
          setRedeemableRewards(redeemable);
        }
      } else {
        setLoyaltyEntries([]);
        setRedeemableRewards([]);
      }

      const { data: offersData } = await supabase
        .from('new_customer_offers')
        .select('id, merchant_customer_id, title, description, bonus_stamps')
        .eq('is_active', true);

      if (offersData && offersData.length > 0) {
        const filteredOffers = offersData.filter(offer => !stampedMerchantIds.includes(offer.merchant_customer_id));
        if (filteredOffers.length > 0) {
          const offerMerchantIds = filteredOffers.map(o => o.merchant_customer_id);
          const { data: offerCustomersData } = await supabase
            .from('customers')
            .select('id, name, company_name, logo_url, industry, street, house_number, postal_code, city, latitude, longitude')
            .in('id', offerMerchantIds);

          let formattedOffers = filteredOffers.map(offer => {
            const customer = offerCustomersData?.find(c => c.id === offer.merchant_customer_id);
            let distance: number | undefined;
            if (userLocation && customer?.latitude && customer?.longitude) {
              distance = haversineDistance(userLocation.lat, userLocation.lng, customer.latitude, customer.longitude);
            }
            return { ...offer, customer, distance };
          });
          formattedOffers.sort((a: any, b: any) => {
            if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
            if (a.distance !== undefined) return -1;
            if (b.distance !== undefined) return 1;
            return 0;
          });
          formattedOffers = formattedOffers.slice(0, 5);
          setNewCustomerOffers(formattedOffers);
        } else {
          setNewCustomerOffers([]);
        }
      }
    } catch (err) {
      console.error('[AppHome] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Neukundenprämien Section - TOP */}
      {newCustomerOffers.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground">Neukundenprämien</h2>
          <p className="text-sm text-muted-foreground mb-4">Angebote in deiner Nähe</p>
          <div className="space-y-3">
            {newCustomerOffers.map((offer: any) => (
              <Card key={offer.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-primary/20" onClick={() => navigate(`/app/merchant/${offer.merchant_customer_id}`)}>
                <div className="flex items-center gap-4">
                  {offer.customer?.logo_url ? (
                    <img src={offer.customer.logo_url} alt={offer.customer.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{offer.customer?.name?.charAt(0) || '?'}</div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{offer.customer?.company_name || offer.customer?.name || 'Unbekannt'}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{offer.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                        <Gift className="h-3 w-3" />+{offer.bonus_stamps} Bonus-Punkte
                      </span>
                      {offer.distance !== undefined && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {offer.distance < 1 ? `${Math.round(offer.distance * 1000)}m` : `${offer.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mini Dashboard */}
      <div>
        {loading ? (
          <Card className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </Card>
        ) : redeemableRewards.length > 0 ? (
          <Card className="p-5 cursor-pointer hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{redeemableRewards.length}</div>
                <div className="text-sm text-green-600 dark:text-green-500">{redeemableRewards.length === 1 ? 'Einlösbare Prämie' : 'Einlösbare Prämien'}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-green-400" />
            </div>
          </Card>
        ) : loyaltyEntries.length > 0 ? (
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-primary">{loyaltyEntries.reduce((sum: number, e: any) => sum + e.current_points, 0)}</div>
                <div className="text-sm text-muted-foreground">Punkte bei {loyaltyEntries.length} {loyaltyEntries.length === 1 ? 'Laden' : 'Läden'}</div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <TrendingUp className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Noch keine Punkte</h3>
            <p className="text-sm text-muted-foreground mb-4">Besuche einen teilnehmenden Shop und scanne deinen ersten NFC-Stempel!</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/stores')}>Shops entdecken</Button>
          </Card>
        )}
      </div>

      {/* Support */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-3">Support</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 hover:shadow-md transition-shadow">
            <button onClick={() => window.open('https://wa.me/', '_blank')} className="w-full text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-3"><MessageSquare className="h-8 w-8 text-green-500" /></div>
              <h3 className="font-semibold text-foreground mb-1">Hilfe benötigt?</h3>
              <p className="text-xs text-muted-foreground">Schreib uns auf WhatsApp</p>
            </button>
          </Card>
          <Card className="p-4 hover:shadow-md transition-shadow">
            <button onClick={() => navigate('/app/suggest-shop')} className="w-full text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3"><Store className="h-8 w-8 text-primary" /></div>
              <h3 className="font-semibold text-foreground mb-1">Dir fehlt dein Lieblingsladen?</h3>
              <p className="text-xs text-muted-foreground">Jetzt vorschlagen</p>
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Messages Content
const AppMessagesContent = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadMessages();
  }, [user]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_messages')
        .select('id, title, body, sent_at, read_at, merchant_customer_id')
        .eq('user_id', user?.id)
        .order('sent_at', { ascending: false });

      if (data) {
        const merchantIds = [...new Set(data.map(m => m.merchant_customer_id))];
        const { data: merchants } = await supabase.from('customers').select('id, name, logo_url').in('id', merchantIds);
        setMessages(data.map(msg => ({ ...msg, merchant: merchants?.find(m => m.id === msg.merchant_customer_id) })));
      }
    } catch (err) {
      console.error('[Messages] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground mb-4">Nachrichten</h2>
      {loading ? (
        <Card className="p-6"><p className="text-muted-foreground text-center">Lädt...</p></Card>
      ) : messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className={`p-4 ${!msg.read_at ? 'border-primary/50 bg-primary/5' : ''}`}>
              <div className="flex items-start gap-3">
                {msg.merchant?.logo_url ? (
                  <img src={msg.merchant.logo_url} alt={msg.merchant.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground truncate">{msg.merchant?.name || 'Eloyo'}</h3>
                    <span className="text-xs text-muted-foreground">{formatDate(msg.sent_at)}</span>
                  </div>
                  <p className="font-medium text-foreground mb-1">{msg.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{msg.body}</p>
                </div>
                {!msg.read_at && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Keine Nachrichten</h3>
          <p className="text-sm text-muted-foreground">Du hast noch keine Nachrichten erhalten.</p>
        </Card>
      )}
    </div>
  );
};

// Stores Content
const AppStoresContent = () => {
  const navigate = useNavigate();
  const { setSwipeEnabled } = useSwipeControl();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Enable/disable swipe based on active tab
  useEffect(() => {
    setSwipeEnabled(activeTab === 'list');
    return () => setSwipeEnabled(true); // Re-enable on unmount
  }, [activeTab, setSwipeEnabled]);

  useEffect(() => {
    loadMerchants();
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    try {
      setLocationError(null);
      const location = await getCurrentLocation();
      if (location) setUserLocation({ lat: location.latitude, lng: location.longitude });
    } catch (err: any) {
      console.log('[Stores] Location not available:', err);
      setLocationError(err?.message || 'Standort nicht verfügbar');
    }
  };

  const loadMerchants = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name, company_name, logo_url, cover_image_url, industry, latitude, longitude, city, street, house_number, postal_code')
        .eq('active', true);
      if (data) setMerchants(data);
    } catch (err) {
      console.error('[Stores] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filteredMerchants = merchants.filter(m =>
    (m.name || m.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.industry || '').toLowerCase().includes(searchQuery.toLowerCase())
  ).map(m => ({
    ...m,
    distance: userLocation && m.latitude && m.longitude ? calculateDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude) : null
  })).sort((a, b) => {
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
    return a.distance !== null ? -1 : b.distance !== null ? 1 : 0;
  });

  // Prepare stores for map
  const storesForMap = filteredMerchants.map(m => ({
    id: m.id,
    name: m.company_name || m.name,
    lat: m.latitude || 0,
    lng: m.longitude || 0,
    logo_url: m.logo_url,
    distance: m.distance,
  })).filter(s => s.lat !== 0 && s.lng !== 0);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Liste
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'map' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Karte
        </button>
      </div>

      {activeTab === 'list' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Geschäft suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          {loading ? (
            <Card className="p-6"><p className="text-muted-foreground text-center">Lädt...</p></Card>
          ) : filteredMerchants.length > 0 ? (
            <div className="space-y-3">
              {filteredMerchants.map((merchant) => (
                <button
                  key={merchant.id}
                  onClick={() => navigate(`/app/merchant/${merchant.id}`)}
                  className="w-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow text-left relative"
                  style={{ aspectRatio: '1.55 / 1' }}
                >
                  {/* Background - Cover Image or Gradient */}
                  <div className="absolute inset-0">
                    {merchant.cover_image_url ? (
                      <img src={merchant.cover_image_url} alt={merchant.company_name || merchant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-secondary" />
                    )}
                  </div>
                  {/* Logo - Top Left */}
                  <div className="absolute top-3 left-3 z-20 w-16 h-16 rounded-full bg-background border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
                    {merchant.logo_url ? (
                      <img src={merchant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">{(merchant.company_name || merchant.name || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {/* Distance Badge - Top Right */}
                  {merchant.distance !== null && (
                    <div className="absolute top-3 right-3 z-20">
                      <span className="bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                        {merchant.distance < 1 ? `${Math.round(merchant.distance * 1000)}m` : `${merchant.distance.toFixed(1)}km`}
                      </span>
                    </div>
                  )}
                  {/* Gradient Overlay for Text */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                  {/* Name and Category - Bottom */}
                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <h3 className="text-white font-semibold text-base truncate drop-shadow-md">{merchant.company_name || merchant.name}</h3>
                    {merchant.industry && <p className="text-white/80 text-sm truncate drop-shadow-md">{merchant.industry}</p>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Keine Geschäfte gefunden</h3>
              <p className="text-sm text-muted-foreground">Versuche eine andere Suche.</p>
            </Card>
          )}
        </>
      )}

      {activeTab === 'map' && (
        <div 
          className="h-[calc(100vh-280px)] rounded-xl overflow-hidden"
          style={{ touchAction: 'none' }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {locationError ? (
            <Card className="p-6 text-center h-full flex flex-col items-center justify-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-muted-foreground mb-4">{locationError}</p>
              <Button onClick={loadUserLocation} variant="outline">Erneut versuchen</Button>
            </Card>
          ) : userLocation ? (
            <div style={{ touchAction: 'auto', width: '100%', height: '100%' }}>
              <StoresGoogleMap stores={storesForMap} userLocation={[userLocation.lat, userLocation.lng]} />
            </div>
          ) : (
            <Card className="p-6 text-center h-full flex flex-col items-center justify-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Lade Standort...</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// Profile Content
const AppProfileContent = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Erfolgreich abgemeldet');
      navigate('/app/auth');
    } catch (error) {
      toast.error('Fehler beim Abmelden');
    }
  };

  const menuItems = [
    { icon: User, label: 'Kontoeinstellungen', action: () => navigate('/app/settings') },
    { icon: Sparkles, label: 'Shop vorschlagen', action: () => navigate('/app/suggest-shop') },
    { icon: Store, label: 'Meine Stempelkarten', action: () => navigate('/app/my-cards') },
    { icon: History, label: 'Transaktionen', action: () => navigate('/app/history') },
  ];

  return (
    <div className="space-y-6">
      {/* 2x2 Grid Menu Items */}
      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="aspect-square bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground text-center">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Support & Sicherheit</h3>
        <div className="space-y-2">
          {[
            { icon: HelpCircle, label: 'Kontakt & Hilfe', href: 'mailto:support@eloyo.de' },
            { icon: FileText, label: 'Nutzungsbedingungen', href: '/app/terms' },
            { icon: Shield, label: 'Datenschutz', href: '/app/privacy' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => item.href.startsWith('mailto') ? window.open(item.href) : navigate(item.href)}>
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />Abmelden
      </Button>
    </div>
  );
};

export default SwipeableAppContainer;
