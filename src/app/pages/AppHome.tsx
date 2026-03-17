import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, MapPin, Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/app/components/layout/MainLayout';

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
      const items: FeedItem[] = [];

      // Get user's loyalty accounts to know which merchants they follow
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
            .select('id, name, company_name, logo_url')
            .in('id', postMerchantIds);

          // Get like counts and user likes
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
            });
          });
      }

      // Add merchant card entries for stamped merchants (so feed isn't empty)
      if (stampedMerchantIds.length > 0) {
        const { data: stampedMerchants } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url, description, updated_at')
          .in('id', stampedMerchantIds);

        // Set of merchants that already have feed posts
        const merchantsWithPosts = new Set(items.filter(i => i.type === 'post').map(i => i.merchant_customer_id));

        stampedMerchants?.forEach(m => {
          // Only add merchant card if they don't already have feed posts
          if (!merchantsWithPosts.has(m.id)) {
            const account = accounts?.find(a => a.merchant_customer_id === m.id);
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
            });
          }
        });
      }
      }

      // Load new customer offers (for merchants where user has NO points)
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
              type: 'offer',
              id: offer.id,
              merchant_customer_id: offer.merchant_customer_id,
              merchant_name: m?.company_name || m?.name || 'Unbekannt',
              merchant_logo: m?.logo_url || null,
              image_url: offer.image_url || m?.cover_image_url || null,
              body: offer.description,
              title: offer.title,
              bonus_stamps: offer.bonus_stamps ?? 0,
              distance,
              created_at: offer.created_at || new Date().toISOString(),
              like_count: 0,
              liked_by_user: false,
            });
          });
        }
      }

      // Sort: offers by distance first, then all by date
      items.sort((a, b) => {
        // Offers with distance come first
        if (a.type === 'offer' && b.type === 'offer') {
          if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
          if (a.distance !== undefined) return -1;
          if (b.distance !== undefined) return 1;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setFeedItems(items);
    } catch (err) {
      console.error('[Feed] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (item: FeedItem) => {
    if (item.type !== 'post') return;

    // Optimistic update
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
            <div key={`${item.type}-${item.id}`} className={`bg-card ${item.type === 'offer' ? 'border-l-4 border-primary' : ''}`}>
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
                  {item.type === 'offer' && item.distance !== undefined && (
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
                // Merchant card: rectangular cover image (like stamp card header)
                <div
                  className="w-full aspect-[16/7] bg-muted cursor-pointer"
                  onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
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
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
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
                  </div>
                )}

                {item.type === 'offer' && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                      <Gift className="h-4 w-4" />
                      Neukundenprämie
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
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default AppHome;
