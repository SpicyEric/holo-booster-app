import { useCallback, useEffect, useState, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Store, Gift, MessageSquare, Mail, Bell, MapPin, Search, User, History, LogOut, Shield, FileText, HelpCircle, ChevronRight, Sparkles, AlertCircle, TrendingUp, Trophy, Loader2, Heart } from 'lucide-react';
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
import { getCurrentLocation } from '@/app/services/geolocationService';
import { toast } from 'sonner';
import { usePushNotifications } from '@/app/hooks/usePushNotifications';
import { useMessageNotifications } from '@/app/hooks/useMessageNotifications';
import { useBackButton } from '@/app/hooks/useBackButton';
import { ExitAppDialog } from '@/app/components/ExitAppDialog';
import { useStatusBar } from '@/app/hooks/useStatusBar';

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
  0: 'Feed',
  1: 'Stores',
  2: 'Nachrichten',
  3: 'Einstellungen',
};

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
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (user) loadFeed();
  }, [user, userLocation]);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const items: any[] = [];

      const { data: activeBoosts } = await supabase
        .from('merchant_boosts')
        .select('merchant_customer_id, tier')
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString());

      const boostMap = new Map<string, number>();
      activeBoosts?.forEach((boost) => {
        const radius = boost.tier === '14_days' ? 15 : 10;
        const existing = boostMap.get(boost.merchant_customer_id);
        if (!existing || radius > existing) boostMap.set(boost.merchant_customer_id, radius);
      });

      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('merchant_customer_id, current_points_balance')
        .eq('user_id', user!.id);

      const stampedMerchantIds = accounts?.map(a => a.merchant_customer_id) || [];
      const stampedSet = new Set(stampedMerchantIds);

      if (stampedMerchantIds.length > 0) {
        const { data: posts } = await supabase
          .from('feed_posts')
          .select('id, merchant_customer_id, image_url, body, created_at')
          .in('merchant_customer_id', stampedMerchantIds)
          .order('created_at', { ascending: false })
          .limit(50);

        if (posts && posts.length > 0) {
          const postMerchantIds = [...new Set(posts.map(p => p.merchant_customer_id))];
          const { data: merchants } = await supabase
            .from('customers')
            .select('id, name, company_name, logo_url, latitude, longitude')
            .in('id', postMerchantIds);

          const postIds = posts.map(p => p.id);
          const { data: allLikes } = await supabase
            .from('feed_post_likes')
            .select('feed_post_id, user_id')
            .in('feed_post_id', postIds);

          const likeCounts = new Map<string, number>();
          const userLikes = new Set<string>();
          allLikes?.forEach(l => {
            likeCounts.set(l.feed_post_id, (likeCounts.get(l.feed_post_id) || 0) + 1);
            if (l.user_id === user!.id) userLikes.add(l.feed_post_id);
          });

          posts.forEach(post => {
            const m = merchants?.find(m => m.id === post.merchant_customer_id);
            let distance: number | undefined;
            if (userLocation && m?.latitude && m?.longitude) {
              distance = haversineDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude);
            }
            items.push({
              type: 'post', id: post.id, merchant_customer_id: post.merchant_customer_id,
              merchant_name: m?.company_name || m?.name || 'Unbekannt', merchant_logo: m?.logo_url || null,
              image_url: post.image_url, body: post.body, created_at: post.created_at,
              like_count: likeCounts.get(post.id) || 0, liked_by_user: userLikes.has(post.id),
              distance,
            });
          });
        }
      }

      if (stampedMerchantIds.length > 0) {
        const { data: stampedMerchants } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url, description, updated_at, latitude, longitude')
          .in('id', stampedMerchantIds);

        const merchantsWithPosts = new Set(items.filter((i: any) => i.type === 'post').map((i: any) => i.merchant_customer_id));

        stampedMerchants?.forEach(m => {
          if (!merchantsWithPosts.has(m.id)) {
            const account = accounts?.find(a => a.merchant_customer_id === m.id);
            let distance: number | undefined;
            if (userLocation && m?.latitude && m?.longitude) {
              distance = haversineDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude);
            }
            items.push({
              type: 'merchant_card',
              id: `mc-${m.id}`,
              merchant_customer_id: m.id,
              merchant_name: m.company_name || m.name || 'Unbekannt',
              merchant_logo: m.logo_url || null,
              image_url: m.cover_image_url || null,
              body: m.description || null,
              created_at: m.updated_at || new Date().toISOString(),
              like_count: 0, liked_by_user: false,
              points_balance: account?.current_points_balance ?? 0,
              distance,
            });
          }
        });
      }

      const { data: offersData } = await supabase
        .from('new_customer_offers')
        .select('id, merchant_customer_id, title, description, bonus_stamps, created_at, image_url')
        .eq('is_active', true);

      if (offersData && offersData.length > 0) {
        const filteredOffers = offersData.filter(o => !stampedSet.has(o.merchant_customer_id));
        if (filteredOffers.length > 0) {
          const offerMerchantIds = filteredOffers.map(o => o.merchant_customer_id);
          const { data: offerMerchants } = await supabase
            .from('customers')
            .select('id, name, company_name, logo_url, cover_image_url, latitude, longitude')
            .in('id', offerMerchantIds);

          filteredOffers.forEach(offer => {
            const m = offerMerchants?.find(c => c.id === offer.merchant_customer_id);
            let distance: number | undefined;
            if (userLocation && m?.latitude && m?.longitude) {
              distance = haversineDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude);
            }
            items.push({
              type: 'offer', id: offer.id, merchant_customer_id: offer.merchant_customer_id,
              merchant_name: m?.company_name || m?.name || 'Unbekannt', merchant_logo: m?.logo_url || null,
              image_url: offer.image_url || m?.cover_image_url || null, body: offer.description, title: offer.title,
              bonus_stamps: offer.bonus_stamps ?? 0, distance, created_at: offer.created_at || new Date().toISOString(),
              like_count: 0, liked_by_user: false,
            });
          });
        }
      }

      const enhancedItems = items.map((item) => ({
        ...item,
        is_boosted: boostMap.has(item.merchant_customer_id),
        boost_radius: boostMap.get(item.merchant_customer_id),
      }));

      enhancedItems.sort((a, b) => {
        const aBoosted = a.is_boosted && (a.distance === undefined || a.distance <= (a.boost_radius ?? 10));
        const bBoosted = b.is_boosted && (b.distance === undefined || b.distance <= (b.boost_radius ?? 10));

        if (aBoosted && !bBoosted) return -1;
        if (!aBoosted && bBoosted) return 1;

        if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setFeedItems(enhancedItems);
    } catch (err) {
      console.error('[Feed] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (item: any) => {
    if (item.type !== 'post') return;
    setFeedItems(prev => prev.map(fi =>
      fi.id === item.id
        ? { ...fi, liked_by_user: !fi.liked_by_user, like_count: fi.liked_by_user ? fi.like_count - 1 : fi.like_count + 1 }
        : fi
    ));
    if (item.liked_by_user) {
      await supabase.from('feed_post_likes').delete().eq('feed_post_id', item.id).eq('user_id', user!.id);
    } else {
      await supabase.from('feed_post_likes').insert({ feed_post_id: item.id, user_id: user!.id });
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `vor ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `vor ${days}T`;
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const handleRefresh = useCallback(async () => {
    await loadFeed();
  }, [user, userLocation]);

  if (loading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PullToRefresh>
    );
  }

  if (feedItems.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="text-center py-16 px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Dein Feed ist noch leer</h3>
          <p className="text-sm text-muted-foreground">
            Besuche einen teilnehmenden Shop und scanne deinen ersten NFC-Stempel, um Posts zu sehen!
          </p>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="-mx-4 space-y-6">
      {feedItems.map((item: any) => {
        const isBoostedInRange = item.is_boosted && (item.distance === undefined || item.distance <= (item.boost_radius ?? 10));

        return (
          <div
            key={`${item.type}-${item.id}`}
            className={`bg-card relative ${isBoostedInRange ? 'ring-2 ring-amber-400/60 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]' : ''}`}
            style={isBoostedInRange ? { animation: 'boost-glow 3s ease-in-out infinite' } : undefined}
          >



            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}>
              {item.merchant_logo ? (
                <img src={item.merchant_logo} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {item.merchant_name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground">{item.merchant_name}</span>
              </div>
              {item.distance !== undefined && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {item.distance < 1 ? `${Math.round(item.distance * 1000)}m` : `${item.distance.toFixed(1)}km`}
                </span>
              )}
            </div>

            {item.type === 'merchant_card' ? (
              <div className="w-full aspect-[16/7] bg-muted cursor-pointer" onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}>
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">{item.merchant_name.charAt(0)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : item.image_url ? (
              <div className="w-full aspect-square bg-muted cursor-pointer" onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}>
                <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center cursor-pointer" onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}>
                {item.type === 'offer' ? (
                  <div className="text-center px-8">
                    <Gift className="h-16 w-16 text-primary mx-auto mb-4" />
                    <p className="text-2xl font-bold text-foreground">{item.title}</p>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary">{item.merchant_name.charAt(0)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="px-4 py-3">
              {item.type === 'post' && (
                <div className="flex items-center gap-4 mb-2">
                  <button onClick={() => toggleLike(item)} className="flex items-center gap-1.5">
                    <Heart className={`h-6 w-6 transition-colors ${item.liked_by_user ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
                  </button>
                  {item.like_count > 0 && (
                    <span className="text-sm font-semibold text-foreground">{item.like_count} {item.like_count === 1 ? 'Like' : 'Likes'}</span>
                  )}
                </div>
              )}
              {item.type === 'offer' && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                    <Gift className="h-4 w-4" />Neukundenprämie
                  </span>
                </div>
              )}
              {item.type === 'merchant_card' && item.points_balance !== undefined && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                    {item.points_balance} Punkte gesammelt
                  </span>
                </div>
              )}
              {item.type === 'offer' && item.title && (
                <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
              )}
              {(item.body || item.title) && (
                <p className="text-sm text-foreground">
                  <span className="font-semibold mr-1.5">{item.merchant_name}</span>
                  {item.type === 'offer' ? (item.body || item.title) : item.body}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
    <style>{`
      @keyframes boost-glow {
        0%, 100% {
          box-shadow: 0 0 12px -3px rgba(245, 158, 11, 0.25);
        }
        50% {
          box-shadow: 0 0 20px -2px rgba(245, 158, 11, 0.45);
        }
      }
    `}</style>
    </PullToRefresh>
  );
};

// Messages Content
const AppMessagesContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);
  const [redeemableCount, setRedeemableCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadMessages();
      checkVerification();
      loadRedeemableRewards();
      localStorage.setItem(`rewards_seen_${user.id}`, Date.now().toString());
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
        <Card className="p-4 border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">E-Mail bestätigen</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Bitte bestätige deine E-Mail-Adresse, um Prämien einlösen zu können.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Redeemable rewards card */}
      {redeemableCount > 0 && (
        <Card
          className="p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20"
          onClick={() => navigate('/app/rewards')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-green-700 dark:text-green-400">{redeemableCount}</div>
              <div className="text-sm text-green-600 dark:text-green-500">
                {redeemableCount === 1 ? 'Einlösbare Prämie' : 'Einlösbare Prämien'}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-green-400" />
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
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] ${!msg.read_at ? 'border-l-4 border-l-primary' : ''}`}
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
                  <div className="absolute top-3 left-3 z-10 w-16 h-16 rounded-full bg-background border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
                    {merchant.logo_url ? (
                      <img src={merchant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">{(merchant.company_name || merchant.name || '?').charAt(0).toUpperCase()}</span>
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
