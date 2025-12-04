import { useCallback, useEffect, useState, createContext, useContext } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Store, Gift, MessageSquare, Mail, Bell, MapPin, Search, User, History, LogOut, Shield, FileText, HelpCircle, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
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
      </div>
    </SwipeControlContext.Provider>
  );
};

// Home Content
const AppHomeContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stampCards, setStampCards] = useState<any[]>([]);
  const [newCustomerOffers, setNewCustomerOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cards } = await supabase
        .from('user_stamp_cards')
        .select(`id, merchant_customer_id, current_points, stamp_card_id`)
        .eq('user_id', user?.id);

      if (cards && cards.length > 0) {
        const merchantIds = cards.map(c => c.merchant_customer_id);
        const stampCardIds = cards.map(c => c.stamp_card_id).filter(Boolean);

        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url, industry')
          .in('id', merchantIds);

        const { data: stampCardsData } = stampCardIds.length > 0 
          ? await supabase.from('stamp_cards').select('id, stamp_count, background_color, stamp_type').in('id', stampCardIds)
          : { data: [] };

        setStampCards(cards.map(card => ({
          ...card,
          customer: customersData?.find(c => c.id === card.merchant_customer_id),
          stamp_card: stampCardsData?.find(sc => sc.id === card.stamp_card_id),
        })));
      }

      const { data: offersData } = await supabase
        .from('new_customer_offers')
        .select('id, merchant_customer_id, title, description, bonus_stamps')
        .eq('is_active', true);

      if (offersData && offersData.length > 0) {
        const offerMerchantIds = offersData.map(o => o.merchant_customer_id);
        const { data: offerCustomersData } = await supabase
          .from('customers')
          .select('id, name, logo_url, industry')
          .in('id', offerMerchantIds);

        setNewCustomerOffers(offersData.map(offer => ({
          ...offer,
          customer: offerCustomersData?.find(c => c.id === offer.merchant_customer_id),
        })));
      }
    } catch (err) {
      console.error('[AppHome] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Deine Stempelkarten</h2>
        {loading ? (
          <Card className="p-6"><p className="text-muted-foreground text-center">Lädt...</p></Card>
        ) : stampCards.length > 0 ? (
          <div className="space-y-4">
            {stampCards.map((card) => (
              <Card key={card.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/app/merchant/${card.merchant_customer_id}`)}>
                <div className="flex items-center gap-4">
                  {card.customer?.logo_url ? (
                    <img src={card.customer.logo_url} alt={card.customer.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {(card.customer?.company_name || card.customer?.name || '?').charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{card.customer?.company_name || card.customer?.name || 'Unbekannt'}</h3>
                    <p className="text-sm text-muted-foreground">{card.customer?.industry || 'Geschäft'}</p>
                    <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {card.current_points} Punkte
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
            <h3 className="text-xl font-bold mb-2">Noch keine Stempelkarten</h3>
            <p className="text-primary-foreground/90 mb-6">Besuche umliegende Shops und sammle deine ersten Stempel.</p>
            <div className="relative h-40 mb-4">
              {[{ rot: -15, top: 0 }, { rot: 0, top: 4 }, { rot: 15, top: 8 }, { rot: 25, top: 12 }].map((s, i) => (
                <div key={i} className="absolute left-1/2 -translate-x-1/2 w-32 h-32" style={{ transform: `translateX(-50%) rotate(${s.rot}deg)`, top: `${s.top * 4}px` }}>
                  <div className={`w-full h-full rounded-2xl bg-gradient-to-br from-[hsl(${240 + i * 10},${85 - i * 5}%,${65 + i * 5}%)] to-[hsl(${240 + i * 10},${85 - i * 5}%,${55 + i * 5}%)] shadow-lg`} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-primary-foreground/20">
              <span className="text-sm text-primary-foreground/80">Geschäfte in deiner Nähe</span>
              <Button variant="secondary" size="sm" onClick={() => navigate('/app/stores')} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                Shops finden
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Neukundenprämien</h2>
        {loading ? (
          <Card className="p-6"><p className="text-muted-foreground text-center">Lädt...</p></Card>
        ) : newCustomerOffers.length > 0 ? (
          <div className="space-y-3">
            {newCustomerOffers.map((offer) => (
              <Card key={offer.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/app/merchant/${offer.merchant_customer_id}`)}>
                <div className="flex items-center gap-4">
                  {offer.customer?.logo_url ? (
                    <img src={offer.customer.logo_url} alt={offer.customer.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{offer.customer?.name?.charAt(0) || '?'}</div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{offer.customer?.name || 'Unbekannt'}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{offer.title}</p>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                      <Gift className="h-3 w-3" />+{offer.bonus_stamps} Bonus-Stempel
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center"><p className="text-muted-foreground">Derzeit keine Neukundenprämien verfügbar</p></Card>
        )}
      </div>

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
              {/* TEST v1 - Yellow cards with red border */}
              {filteredMerchants.map((merchant) => (
                <button
                  key={merchant.id}
                  onClick={() => navigate(`/app/merchant/${merchant.id}`)}
                  className="w-full rounded-xl overflow-hidden shadow-md text-left relative"
                  style={{ aspectRatio: '1.55 / 1', border: '8px solid red', backgroundColor: 'yellow' }}
                >
                  <div className="absolute inset-0">
                    {merchant.cover_image_url ? (
                      <img src={merchant.cover_image_url} alt={merchant.company_name || merchant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500" />
                    )}
                  </div>
                  {/* Logo - Top Left */}
                  <div className="absolute top-3 left-3 z-20 w-12 h-12 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
                    {merchant.logo_url ? (
                      <img src={merchant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white">{(merchant.company_name || merchant.name || '?').charAt(0).toUpperCase()}</span>
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
                  {/* Gradient Overlay */}
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
    { icon: Store, label: 'Meine Stempelkarten', action: () => navigate('/app/stores') },
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
            { icon: FileText, label: 'Nutzungsbedingungen', href: '/datenschutz' },
            { icon: Shield, label: 'Datenschutz', href: '/datenschutz' },
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
