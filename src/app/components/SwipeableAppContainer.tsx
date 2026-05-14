import { useCallback, useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import useEmblaCarousel from 'embla-carousel-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Store, Gift, MessageSquare, Mail, Bell, MapPin, Search, User, History, LogOut, Shield, FileText, HelpCircle, ChevronRight, Sparkles, AlertCircle, TrendingUp, Trophy, Loader2, Heart, Nfc, Clock, Globe, Instagram, Facebook, Twitter } from 'lucide-react';
import { PullToRefresh } from '@/app/components/PullToRefresh';
import { StoresGoogleMap } from '@/app/components/StoresGoogleMap';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TopBar } from './layout/TopBar';
import { BottomNav } from './layout/BottomNav';
import Particles from '@/components/Particles';
import { checkLocationPermission, getCurrentLocation } from '@/app/services/geolocationService';
import { toast } from 'sonner';
import { usePushNotifications } from '@/app/hooks/usePushNotifications';
import { useMessageNotifications } from '@/app/hooks/useMessageNotifications';
import { useBackButton } from '@/app/hooks/useBackButton';
import { ExitAppDialog } from '@/app/components/ExitAppDialog';
import { useStatusBar } from '@/app/hooks/useStatusBar';
import { OpenInvitationsBanner } from '@/app/components/OpenInvitationsBanner';

// Map route paths to carousel indices
const ROUTE_TO_INDEX: Record<string, number> = {
  '/app': 0,
  '/app/stores': 1,
  '/app/messages': 2,
  '/app/profile': 3,
};

const INDEX_TO_ROUTE: Record<number, string> = {
  0: '/app',
  1: '/app/stores',
  2: '/app/messages',
  3: '/app/profile',
};

const INDEX_TO_TITLE: Record<number, string> = {
  0: 'Home',
  1: 'Stores',
  2: 'Nachrichten',
  3: 'Einstellungen',
};

type OpeningHourEntry = { open?: string; close?: string; closed?: boolean };

type HomeMerchantCard = {
  id: string;
  merchantId: string;
  name: string;
  category: string | null;
  logoUrl: string | null;
  coverImage: string | null;
  distance: number | null;
  description: string | null;
  openingHours: Record<string, OpeningHourEntry> | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
};

const HOME_DAY_LABELS: { key: string; label: string }[] = [
  { key: 'monday', label: 'Mo' },
  { key: 'tuesday', label: 'Di' },
  { key: 'wednesday', label: 'Mi' },
  { key: 'thursday', label: 'Do' },
  { key: 'friday', label: 'Fr' },
  { key: 'saturday', label: 'Sa' },
  { key: 'sunday', label: 'So' },
];

function normalizeHomeUrl(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeInstagramUrl(value: string | null): string | null {
  const trimmed = value?.trim().replace(/^@/, '');
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://instagram.com/${trimmed}`;
}

export const SwipeableAppContainer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prevPathRef = useRef(location.pathname);
  const [currentIndex, setCurrentIndex] = useState(() => {
    return ROUTE_TO_INDEX[window.location.pathname] ?? 0;
  });
  
  // Reset window scroll on mount — prevents scroll offset leaking from detail/scan pages
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);
  
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
    startIndex: currentIndex,
    watchDrag: false,
    duration: 25,
  });

  // Sync carousel with current route on mount and route changes
  useEffect(() => {
    const targetIndex = ROUTE_TO_INDEX[location.pathname];
    if (targetIndex !== undefined && emblaApi) {
      // Smooth animation for tab-to-tab navigation, instant jump when returning from detail pages
      const prevWasTab = ROUTE_TO_INDEX[prevPathRef.current] !== undefined;
      emblaApi.scrollTo(targetIndex, !prevWasTab);
      setCurrentIndex(targetIndex);
    }
    prevPathRef.current = location.pathname;
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

  const topInsetOffset = '3.5rem';
  const bottomInsetOffset = 'calc(5rem + env(safe-area-inset-bottom, 0px))';

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-background to-muted/30 overflow-hidden"
      style={{
        minHeight: '100dvh',
        paddingTop: topInsetOffset,
        paddingBottom: bottomInsetOffset,
      }}
    >
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
      
      <div
        className="overflow-hidden"
        style={{ height: `calc(100dvh - ${topInsetOffset} - ${bottomInsetOffset})` }}
        ref={emblaRef}
      >
        <div className="flex h-full">
          <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
            <div className="container mx-auto px-4 py-6 pb-16 max-w-2xl relative z-10">
              <AppHomeContent />
            </div>
          </div>
          
          <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
            <div className="container mx-auto px-4 py-6 pb-16 max-w-2xl relative z-10">
              <AppStoresContent />
            </div>
          </div>
          
          <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
            <div className="container mx-auto px-4 py-6 pb-16 max-w-2xl relative z-10">
              <AppMessagesContent />
            </div>
          </div>
          
          <div className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
            <div className="container mx-auto px-4 py-6 pb-16 max-w-2xl relative z-10">
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
  const [cards, setCards] = useState<HomeMerchantCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'center', containScroll: false });

  const loadCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('id, merchant_customer_id')
        .eq('user_id', user.id);

      const merchantIds = (accounts || []).map((a) => a.merchant_customer_id);
      if (merchantIds.length === 0) {
        setCards([]);
        return;
      }

      const { data: merchants } = await supabase
        .from('customers')
        .select('id, name, company_name, logo_url, cover_image_url, industry, latitude, longitude, description, opening_hours, street, house_number, postal_code, city, website, instagram, facebook, twitter')
        .eq('active', true)
        .in('id', merchantIds);

      // Try to get user location to sort by distance (best-effort)
      let userLat: number | null = null;
      let userLng: number | null = null;
      try {
        const perm = await checkLocationPermission();
        if (perm.location === 'granted') {
          const loc = await getCurrentLocation();
          userLat = loc.latitude;
          userLng = loc.longitude;
        }
      } catch {
        // ignore, fallback unsorted
      }

      const list = (accounts || [])
        .map((a) => {
          const m: any = merchants?.find((x) => x.id === a.merchant_customer_id);
          if (!m) return null;
          const lat = m.latitude as number | null;
          const lng = m.longitude as number | null;
          const streetWithNumber = [m.street, m.house_number].filter(Boolean).join(' ');
          const address = [streetWithNumber, [m.postal_code, m.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
          const distance =
            userLat != null && userLng != null && lat != null && lng != null
              ? haversineDistance(userLat, userLng, lat, lng)
              : null;
          return {
            id: a.id,
            merchantId: a.merchant_customer_id,
            name: m.company_name || m.name || 'Unbekannt',
            category: m.industry || null,
            logoUrl: m.logo_url || null,
            coverImage: m.cover_image_url || null,
            distance,
            description: m.description || null,
            openingHours: m.opening_hours && typeof m.opening_hours === 'object' ? m.opening_hours as Record<string, OpeningHourEntry> : null,
            address: address || null,
            website: m.website || null,
            instagram: m.instagram || null,
            facebook: m.facebook || null,
            twitter: m.twitter || null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        .sort((a, b) => {
          if (a.distance == null && b.distance == null) return 0;
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        });

      setCards(list);
    } catch (err) {
      console.error('[Home] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadCards();
  }, [user, loadCards]);

  const handleRefresh = useCallback(async () => {
    await loadCards();
  }, [loadCards]);

  if (loading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <OpenInvitationsBanner />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PullToRefresh>
    );
  }

  if (cards.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <OpenInvitationsBanner />
        <div className="space-y-6 py-4">
          <div className="text-center px-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Willkommen bei Eloyo</h2>
            <p className="text-sm text-muted-foreground">
              So einfach sammelst du Punkte bei deinen Lieblingsshops:
            </p>
          </div>

          <div className="space-y-3">
            {[
              { Icon: MapPin, title: 'Shop entdecken', text: 'Finde teilnehmende Geschäfte in deiner Nähe.' },
              { Icon: Nfc, title: 'Karte scannen', text: 'Halte dein Handy an die NFC-Karte im Shop und sammle Punkte.' },
              { Icon: Gift, title: 'Prämien einlösen', text: 'Tausche gesammelte Punkte gegen Belohnungen ein.' },
            ].map((s, i) => (
              <div key={s.title} className="flex items-start gap-3 p-4 rounded-2xl bg-card shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{i + 1}. {s.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.text}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/app/stores')}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-95 transition-opacity"
          >
            Shops in der Nähe entdecken
          </button>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <OpenInvitationsBanner />
      <div style={{ paddingBottom: '2rem' }}>
        <h2 className="text-lg font-semibold text-foreground px-1 mb-3">Deine Treuepässe</h2>
        <div className="overflow-hidden -mx-4" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {cards.map((store) => (
              <div
                key={store.id}
                className="shrink-0 grow-0 basis-[85%] px-1.5"
              >
                <button
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    try {
                      sessionStorage.setItem(
                        'treuepass-transition',
                        JSON.stringify({
                          merchantId: store.merchantId,
                          coverUrl: store.coverImage,
                          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                          timestamp: Date.now(),
                        }),
                      );
                    } catch {}
                    navigate(`/app/merchant/${store.merchantId}`);
                  }}
                  className="w-full rounded-xl overflow-hidden shadow-md text-left relative block"
                  style={{ aspectRatio: '1.55 / 1', display: 'block' }}
                >
                  <div className="absolute inset-0">
                    {store.coverImage ? (
                      <img src={store.coverImage} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500" />
                    )}
                  </div>
                  <div className="absolute top-3 left-3 z-20 w-12 h-12 rounded-full overflow-hidden">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={`${store.name} Logo`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {store.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <h3 className="text-white font-semibold text-xl truncate drop-shadow-md">{store.name}</h3>
                    {store.category && (
                      <p className="text-white/80 text-sm truncate drop-shadow-md">{store.category}</p>
                    )}
                  </div>
                </button>
                <HomeMerchantInfoBlock store={store} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
};

function HomeMerchantInfoBlock({ store }: { store: HomeMerchantCard }) {
  const links: { href: string; label: string; Icon: typeof Globe }[] = [];
  const web = normalizeHomeUrl(store.website);
  const ig = normalizeInstagramUrl(store.instagram);
  const fb = normalizeHomeUrl(store.facebook);
  const tw = normalizeHomeUrl(store.twitter);
  if (web) links.push({ href: web, label: 'Website', Icon: Globe });
  if (ig) links.push({ href: ig, label: 'Instagram', Icon: Instagram });
  if (fb) links.push({ href: fb, label: 'Facebook', Icon: Facebook });
  if (tw) links.push({ href: tw, label: 'Twitter', Icon: Twitter });

  const visibleHours = store.openingHours
    ? HOME_DAY_LABELS.map(({ key, label }) => {
        const day = store.openingHours?.[key];
        if (!day) return null;
        return {
          label,
          time: day.closed ? 'Geschlossen' : [day.open, day.close].filter(Boolean).join(' – '),
        };
      }).filter((entry): entry is { label: string; time: string } => !!entry && !!entry.time)
    : [];

  if (!store.description && visibleHours.length === 0 && !store.address && links.length === 0) return null;

  return (
    <div className="mt-3 space-y-3 px-1 pb-1 text-left">
      {store.description && (
        <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
          {store.description}
        </p>
      )}

      {visibleHours.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-background/75 p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            Öffnungszeiten
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {visibleHours.map((entry) => (
              <div key={entry.label} className="contents">
                <span className="text-muted-foreground">{entry.label}</span>
                <span className="text-foreground">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {store.address && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 text-sm text-foreground/80"
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{store.address}</span>
        </a>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// Messages Content
const AppMessagesContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);

  useEffect(() => {
    if (user) {
      loadMessages();
      checkVerification();
    }
  }, [user]);

  // Reload messages when navigating back to this tab (e.g. from message detail)
  useEffect(() => {
    if (user && location.pathname === '/app/messages') {
      loadMessages();
    }
  }, [location.pathname]);

  const checkVerification = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('email_verified').eq('user_id', user.id).maybeSingle();
    setEmailVerified(data?.email_verified === true);
  };

  // Re-check email verification when app comes back to foreground (e.g. after clicking verify link)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        checkVerification();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  const loadRedeemableRewards = async () => {
    if (!user) return;
    try {
      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('merchant_customer_id, current_points_balance')
        .eq('user_id', user.id)
        .gt('current_points_balance', 0);
      if (!accounts || accounts.length === 0) { setRedeemableCount(0); return; }
      const merchantIds = accounts.map(a => a.merchant_customer_id);
      const pointsMap = new Map(accounts.map(a => [a.merchant_customer_id, a.current_points_balance || 0]));
      const { data: rewards } = await supabase
        .from('rewards')
        .select('id, points_required, merchant_customer_id')
        .eq('is_active', true)
        .in('merchant_customer_id', merchantIds);
      if (rewards) {
        setRedeemableCount(rewards.filter(r => (pointsMap.get(r.merchant_customer_id) || 0) >= r.points_required).length);
      }
    } catch (err) {
      console.error('[Messages] Error loading rewards:', err);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Only show messages from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('app_messages')
        .select('id, title, body, sent_at, read_at, offer_id, merchant_customer_id')
        .eq('user_id', user?.id)
        .gte('sent_at', sevenDaysAgo.toISOString())
        .order('sent_at', { ascending: false });
      if (data) {
        const merchantIds = [...new Set(data.map(m => m.merchant_customer_id))];
        const { data: merchants } = await supabase.from('customers').select('id, name, logo_url').in('id', merchantIds);
        
        // Auto-mark messages WITHOUT offers as read
        const unreadNoOffer = data.filter(m => !m.read_at && !m.offer_id);
        if (unreadNoOffer.length > 0) {
          const ids = unreadNoOffer.map(m => m.id);
          const now = new Date().toISOString();
          await supabase
            .from('app_messages')
            .update({ read_at: now })
            .in('id', ids)
            .eq('user_id', user!.id);
          // Update local data so dots disappear immediately
          data.forEach(m => {
            if (!m.read_at && !m.offer_id) m.read_at = now;
          });
        }
        
        setMessages(data.map(msg => ({ ...msg, merchant: merchants?.find(m => m.id === msg.merchant_customer_id) })));
      }
    } catch (err) {
      console.error('[Messages] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadMessages(), loadRedeemableRewards()]);
  }, [user]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4">
      {/* Email verification banner */}
      {!emailVerified && (
        <Card className="p-4 border-0 bg-muted/70 dark:bg-muted/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">E-Mail bestätigen</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Bitte bestätige deine E-Mail-Adresse, um Prämien einlösen zu können.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Redeemable rewards card */}
      {redeemableCount > 0 && (
        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow border-0 bg-muted/70 dark:bg-muted/50"
          onClick={() => navigate('/app/rewards')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-foreground">{redeemableCount}</div>
              <div className="text-sm text-muted-foreground">
                {redeemableCount === 1 ? 'Einlösbare Prämie' : 'Einlösbare Prämien'}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-6"><p className="text-muted-foreground text-center">Lädt...</p></Card>
      ) : messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card 
              key={msg.id} 
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] border-0 ${!msg.read_at ? 'bg-primary/10' : 'bg-muted/70 dark:bg-muted/50'}`}
              onClick={() => navigate(`/app/messages/${msg.id}`)}
            >
              <div className="flex items-center gap-3">
                {msg.merchant?.logo_url ? (
                  <img src={msg.merchant.logo_url} alt={msg.merchant.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground truncate">{msg.merchant?.name || 'Eloyo'}</h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="font-medium text-foreground text-sm mb-1">{msg.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{msg.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatDate(msg.sent_at)}</span>
                    {msg.offer_id && (
                      <span className="inline-flex items-center text-xs text-primary font-medium">
                        <Gift className="h-3 w-3 mr-1" />Angebot
                      </span>
                    )}
                  </div>
                </div>
                {!msg.read_at && <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        !emailVerified || redeemableCount > 0 ? null : (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Keine Nachrichten</h3>
            <p className="text-sm text-muted-foreground">Du hast noch keine Nachrichten erhalten.</p>
          </Card>
        )
      )}
    </div>
    </PullToRefresh>
  );
};

// Stores Content
const AppStoresContent = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [locationError, setLocationError] = useState<string | null>(null);

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

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadMerchants(), loadUserLocation()]);
  }, []);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-0">
      {/* Sticky header: Tabs + Search */}
      <div className="sticky top-0 z-30 bg-background pb-3 space-y-3">
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Geschäft suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        )}
      </div>

      {activeTab === 'list' && (
        <>

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
                  <div className="absolute top-3 left-3 z-10 w-16 h-16 rounded-full overflow-hidden">
                    {merchant.logo_url ? (
                      <img src={merchant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">{(merchant.company_name || merchant.name || '?').charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  {/* Distance Badge - Top Right */}
                  {merchant.distance !== null && (
                    <div className="absolute top-3 right-3 z-10">
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
    </PullToRefresh>
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
    { icon: Store, label: 'Meine Punktekarten', action: () => navigate('/app/my-cards') },
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
            { icon: HelpCircle, label: 'Kontakt & Hilfe', href: '/app/support' },
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
