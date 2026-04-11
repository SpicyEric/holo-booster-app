import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, MapPin, Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { offlineCacheService } from '@/app/services/offlineQueueService';

interface FeedItem {
  type: 'post' | 'offer' | 'merchant_card';
  id: string;
  merchant_customer_id: string;
  merchant_name: string;
  merchant_logo: string | null;
  image_url: string | null;
  body: string | null;
  title?: string;
  bonus_stamps?: number;
  distance?: number;
  created_at: string;
  like_count: number;
  liked_by_user: boolean;
  points_balance?: number;
  is_boosted?: boolean;
  boost_radius?: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const AppHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Only try to get location silently if permission was already granted
    // Do NOT trigger a permission prompt here
    const tryGetLocation = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') return; // Don't prompt, just skip
          const pos = await Geolocation.getCurrentPosition({ timeout: 5000, maximumAge: 60000 });
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } else {
          // Web: also only use if already granted (no way to check without prompting, so just try)
          navigator.geolocation?.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {},
            { timeout: 5000, maximumAge: 60000 }
          );
        }
      } catch {
        // Silently fail - location is optional for the home feed
      }
    };
    tryGetLocation();
  }, []);

  useEffect(() => {
    if (user) loadFeed();
  }, [user, userLocation]);

  const loadFeed = async () => {
    setLoading(true);
    
    if (!navigator.onLine) {
      const cached = offlineCacheService.get<FeedItem[]>('home_feed');
      if (cached) {
        setFeedItems(cached);
        setLoading(false);
        return;
      }
    }
    
    try {
      const items: FeedItem[] = [];

      // Get active boosts
      const { data: activeBoosts, error: boostError } = await supabase
        .from('merchant_boosts')
        .select('merchant_customer_id, tier')
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString());

      console.log('[Feed] Active boosts:', activeBoosts, 'Error:', boostError);

      const boostMap = new Map<string, number>();
      activeBoosts?.forEach(b => {
        const radius = b.tier === '14_days' ? 15 : 10;
        const existing = boostMap.get(b.merchant_customer_id);
        if (!existing || radius > existing) boostMap.set(b.merchant_customer_id, radius);
      });

      // Get user's loyalty accounts
      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('merchant_customer_id, current_points_balance')
        .eq('user_id', user!.id);

      const stampedMerchantIds = accounts?.map(a => a.merchant_customer_id) || [];
      const stampedSet = new Set(stampedMerchantIds);

      // Load feed posts from merchants where user has points
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
            .eq('active', true)
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
            if (!m) return; // Skip posts from inactive/deleted merchants
            let distance: number | undefined;
            if (userLocation && m?.latitude && m?.longitude) {
              distance = haversineDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude);
            }
            items.push({
              type: 'post',
              id: post.id,
              merchant_customer_id: post.merchant_customer_id,
              merchant_name: m?.company_name || m?.name || 'Unbekannt',
              merchant_logo: m?.logo_url || null,
              image_url: post.image_url,
              body: post.body,
              created_at: post.created_at,
              like_count: likeCounts.get(post.id) || 0,
              liked_by_user: userLikes.has(post.id),
              distance,
              is_boosted: boostMap.has(post.merchant_customer_id),
              boost_radius: boostMap.get(post.merchant_customer_id),
            });
          });
        }

        // Add merchant cards for stamped merchants without posts
        const { data: stampedMerchants } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url, description, updated_at, latitude, longitude')
          .eq('active', true)
          .in('id', stampedMerchantIds);

        const merchantsWithPosts = new Set(items.filter(i => i.type === 'post').map(i => i.merchant_customer_id));

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
              like_count: 0,
              liked_by_user: false,
              points_balance: account?.current_points_balance ?? 0,
              distance,
              is_boosted: boostMap.has(m.id),
              boost_radius: boostMap.get(m.id),
            });
          }
        });
      }

      // Load ALL active merchants (not just those with offers) for discovery
      // Get merchants where user does NOT have a loyalty account
      const { data: allActiveMerchants } = await supabase
        .from('customers')
        .select('id, name, company_name, logo_url, cover_image_url, description, latitude, longitude, updated_at')
        .eq('active', true);

      if (allActiveMerchants) {
        // Already-shown merchant IDs
        const shownMerchantIds = new Set(items.map(i => i.merchant_customer_id));

        // Load new customer offers for enrichment
        const { data: offersData } = await supabase
          .from('new_customer_offers')
          .select('id, merchant_customer_id, title, description, bonus_stamps, created_at, image_url')
          .eq('is_active', true);

        const offersMap = new Map(offersData?.map(o => [o.merchant_customer_id, o]) || []);

        for (const m of allActiveMerchants) {
          if (shownMerchantIds.has(m.id)) continue;
          if (stampedSet.has(m.id)) continue; // already handled above

          let distance: number | undefined;
          if (userLocation && m.latitude && m.longitude) {
            distance = haversineDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude);
          }

          const offer = offersMap.get(m.id);

          if (offer) {
            // Show as offer card
            items.push({
              type: 'offer',
              id: offer.id,
              merchant_customer_id: m.id,
              merchant_name: m.company_name || m.name || 'Unbekannt',
              merchant_logo: m.logo_url || null,
              image_url: offer.image_url || m.cover_image_url || null,
              body: offer.description,
              title: offer.title,
              bonus_stamps: offer.bonus_stamps ?? 0,
              distance,
              created_at: offer.created_at || new Date().toISOString(),
              like_count: 0,
              liked_by_user: false,
              is_boosted: boostMap.has(m.id),
              boost_radius: boostMap.get(m.id),
            });
          } else {
            // Show as merchant card even without offer
            items.push({
              type: 'merchant_card',
              id: `mc-${m.id}`,
              merchant_customer_id: m.id,
              merchant_name: m.company_name || m.name || 'Unbekannt',
              merchant_logo: m.logo_url || null,
              image_url: m.cover_image_url || null,
              body: m.description || null,
              created_at: m.updated_at || new Date().toISOString(),
              like_count: 0,
              liked_by_user: false,
              distance,
              is_boosted: boostMap.has(m.id),
              boost_radius: boostMap.get(m.id),
            });
          }
        }
      }

      // Sort: boosted first (within their tier radius), then non-boosted by distance
      items.sort((a, b) => {
        const aBoosted = a.is_boosted && (a.distance === undefined || a.distance <= (a.boost_radius ?? 10));
        const bBoosted = b.is_boosted && (b.distance === undefined || b.distance <= (b.boost_radius ?? 10));

        if (aBoosted && !bBoosted) return -1;
        if (!aBoosted && bBoosted) return 1;

        // Within same category, sort by distance
        if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setFeedItems(items);
      offlineCacheService.set('home_feed', items);
    } catch (err) {
      console.error('[Feed] Error:', err);
      const cached = offlineCacheService.get<FeedItem[]>('home_feed');
      if (cached) setFeedItems(cached);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (item: FeedItem) => {
    if (item.type !== 'post') return;

    setFeedItems(prev => prev.map(fi =>
      fi.id === item.id
        ? { ...fi, liked_by_user: !fi.liked_by_user, like_count: fi.liked_by_user ? fi.like_count - 1 : fi.like_count + 1 }
        : fi
    ));

    if (item.liked_by_user) {
      await supabase
        .from('feed_post_likes')
        .delete()
        .eq('feed_post_id', item.id)
        .eq('user_id', user!.id);
    } else {
      await supabase
        .from('feed_post_likes')
        .insert({ feed_post_id: item.id, user_id: user!.id });
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

  return (
    <MainLayout title="Feed">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Dein Feed ist noch leer</h3>
          <p className="text-sm text-muted-foreground">
            Besuche einen teilnehmenden Shop und scanne deinen ersten NFC-Stempel, um Posts zu sehen!
          </p>
        </div>
      ) : (
        <div className="-mx-4 space-y-6">
          {feedItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className={`bg-card relative ${
                item.is_boosted && (item.distance === undefined || item.distance <= (item.boost_radius ?? 10))
                  ? 'ring-2 ring-amber-400/60 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]'
                  : ''
              }`}
              style={
                item.is_boosted && (item.distance === undefined || item.distance <= (item.boost_radius ?? 10))
                  ? { animation: 'boost-glow 3s ease-in-out infinite' }
                  : undefined
              }
            >



              {/* Header: profile pic + name */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}
              >
                {item.merchant_logo ? (
                  <img src={item.merchant_logo} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {item.merchant_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm text-foreground">{item.merchant_name}</span>
                  {item.distance !== undefined && (
                    <span className="text-xs text-muted-foreground ml-2">
                      <MapPin className="h-3 w-3 inline -mt-0.5" />
                      {item.distance < 1 ? ` ${Math.round(item.distance * 1000)}m` : ` ${item.distance.toFixed(1)}km`}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{formatTimeAgo(item.created_at)}</span>
              </div>

              {/* Image */}
              {item.type === 'merchant_card' ? (
                <div
                  className="w-full aspect-[16/7] bg-muted cursor-pointer"
                  onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}
                >
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
                <div
                  className="w-full aspect-square bg-muted cursor-pointer"
                  onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}
                >
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div
                  className="w-full aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center cursor-pointer"
                  onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}
                >
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

              {/* Actions + text */}
              <div className="px-4 py-3">
                {item.type === 'post' && (
                  <div className="flex items-center gap-4 mb-2">
                    <button onClick={() => toggleLike(item)} className="flex items-center gap-1.5">
                      <Heart
                        className={`h-6 w-6 transition-colors ${item.liked_by_user ? 'fill-red-500 text-red-500' : 'text-foreground'}`}
                      />
                    </button>
                    {item.like_count > 0 && (
                      <span className="text-sm font-semibold text-foreground">
                        {item.like_count} {item.like_count === 1 ? 'Like' : 'Likes'}
                      </span>
                    )}
                    {item.is_boosted && (item.distance === undefined || item.distance <= (item.boost_radius ?? 10)) && (
                      <span className="inline-flex items-center ml-auto px-2.5 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold">
                        Gesponsert
                      </span>
                    )}
                  </div>
                )}

                {item.type === 'offer' && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                      <Gift className="h-4 w-4" />
                      Neukundenprämie
                    </span>
                    {item.is_boosted && (item.distance === undefined || item.distance <= (item.boost_radius ?? 10)) && (
                      <span className="inline-flex items-center px-2.5 py-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold">
                        Gesponsert
                      </span>
                    )}
                  </div>
                )}

                {item.type === 'merchant_card' && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {item.points_balance !== undefined && item.points_balance > 0 && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                        {item.points_balance} Punkte gesammelt
                      </span>
                    )}
                    {item.is_boosted && (item.distance === undefined || item.distance <= (item.boost_radius ?? 10)) && (
                      <span className="inline-flex items-center px-2.5 py-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold">
                        Gesponsert
                      </span>
                    )}
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
          ))}
        </div>
      )}

      <style>{`
      @keyframes boost-glow {
        0%, 100% {
          box-shadow: 0 0 14px -2px rgba(245, 158, 11, 0.4);
        }
        50% {
          box-shadow: 0 0 22px -1px rgba(245, 158, 11, 0.55);
        }
      }
      `}</style>
    </MainLayout>
  );
};

export default AppHome;
