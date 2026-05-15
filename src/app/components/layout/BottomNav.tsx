import { useEffect, useState } from 'react';
import { Home, MessageSquare, Search, Settings, Nfc, LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getActiveBrandColor, setActiveBrandColor, subscribeActiveBrandColor } from '@/lib/activeBrandColor';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  index: number;
}

interface BottomNavProps {
  onNavigate?: (index: number) => void;
  currentIndex?: number;
}

export const BottomNav = ({ onNavigate, currentIndex }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messageBadge, setMessageBadge] = useState(false);
  const [rawBrandColor, setRawBrandColor] = useState<string | null>(() => getActiveBrandColor());
  const [brandSweepKey, setBrandSweepKey] = useState(0);

  useEffect(() => {
    return subscribeActiveBrandColor((c) => {
      setRawBrandColor(c);
      if (c) setBrandSweepKey((k) => k + 1);
    });
  }, []);

  // Brand-Farbe nur auf Routen aktiv, die selbst eine Markenfarbe publizieren
  // (Merchant-Detail, Scan und Home mit Treuepass-Karten). Auf anderen Tabs
  // wird die Markenfarbe synchron zurückgesetzt.
  const onMerchantDetail = /^\/app\/merchant\//.test(location.pathname);
  const onScan = location.pathname.startsWith('/app/scan');
  const brandColor = onMerchantDetail || onScan ? rawBrandColor : null;

  // Check for unread messages or unseen redeemable rewards
  useEffect(() => {
    if (!user) return;

    const checkBadge = async () => {
      // If user already dismissed badge by visiting messages tab, check timestamp
      const lastVisited = localStorage.getItem(`messages_last_visited_${user.id}`);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Check unread messages
      let query = supabase
        .from('app_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null)
        .gte('sent_at', sevenDaysAgo.toISOString());

      // Only count messages sent after last visit
      if (lastVisited) {
        query = query.gt('sent_at', lastVisited);
      }

      const { count: unreadCount } = await query;

      // Check for unseen redeemable rewards
      let hasUnseenRewards = false;
      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('merchant_customer_id, current_points_balance')
        .eq('user_id', user.id)
        .gt('current_points_balance', 0);

      if (accounts && accounts.length > 0) {
        const merchantIds = accounts.map(a => a.merchant_customer_id);
        const pointsMap = new Map(accounts.map(a => [a.merchant_customer_id, a.current_points_balance || 0]));

        const { data: rewards } = await supabase
          .from('rewards')
          .select('id, points_required, merchant_customer_id')
          .eq('is_active', true)
          .in('merchant_customer_id', merchantIds);

        if (rewards) {
          const redeemableCount = rewards.filter(r => (pointsMap.get(r.merchant_customer_id) || 0) >= r.points_required).length;
          const lastSeenCount = parseInt(localStorage.getItem(`rewards_seen_count_${user.id}`) || '0', 10);
          if (redeemableCount > lastSeenCount) {
            hasUnseenRewards = true;
          }
        }
      }

      setMessageBadge((unreadCount || 0) > 0 || hasUnseenRewards);
    };

    checkBadge();
    const interval = setInterval(checkBadge, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems: NavItem[] = [
    { icon: Home, label: '', path: '/app', index: 0 },
    { icon: Search, label: '', path: '/app/stores', index: 1 },
    { icon: MessageSquare, label: '', path: '/app/messages', index: 2 },
    { icon: Settings, label: '', path: '/app/profile', index: 3 },
  ];

  const handleCenterButtonClick = () => {
    const match = location.pathname.match(/^\/app\/merchant\/([^/?#]+)/);
    const merchantId = match?.[1];
    const params = new URLSearchParams();
    params.set('autostart', String(Date.now()));
    if (merchantId) params.set('merchant', merchantId);
    const url = `/app/scan?${params.toString()}`;

    // Wenn wir gerade auf einer Merchant-Detail-Seite (Treuepass) sind,
    // erst die Exit-Animation abspielen lassen und dann navigieren.
    if (merchantId) {
      const handled = window.dispatchEvent(
        new CustomEvent('app:treuepass-exit-to-scan', {
          detail: { merchantId, scanUrl: url },
          cancelable: true,
        })
      );
      // Wenn die Detailseite das Event bestätigt (preventDefault), kümmert
      // sie sich selbst um die Navigation nach Abschluss der Animation.
      if (!handled) return;
    }
    navigate(url);
  };

  const handleNavClick = (item: NavItem) => {
    // When clicking messages tab, dismiss badge immediately
    if (item.path === '/app/messages' && user) {
      setMessageBadge(false);
      localStorage.setItem(`messages_last_visited_${user.id}`, new Date().toISOString());
      // Also update rewards seen count
      const updateRewardsSeen = async () => {
        try {
          const { data: accounts } = await supabase
            .from('loyalty_accounts')
            .select('merchant_customer_id, current_points_balance')
            .eq('user_id', user.id)
            .gt('current_points_balance', 0);
          if (accounts && accounts.length > 0) {
            const merchantIds = accounts.map(a => a.merchant_customer_id);
            const pointsMap = new Map(accounts.map(a => [a.merchant_customer_id, a.current_points_balance || 0]));
            const { data: rewards } = await supabase
              .from('rewards')
              .select('id, points_required, merchant_customer_id')
              .eq('is_active', true)
              .in('merchant_customer_id', merchantIds);
            if (rewards) {
              const count = rewards.filter(r => (pointsMap.get(r.merchant_customer_id) || 0) >= r.points_required).length;
              localStorage.setItem(`rewards_seen_count_${user.id}`, count.toString());
            }
          }
        } catch {}
      };
      updateRewardsSeen();
    }

    if (onNavigate) {
      onNavigate(item.index);
    } else {
      navigate(item.path);
    }
  };

  const isActive = (item: NavItem) => {
    if (currentIndex !== undefined) return currentIndex === item.index;
    if (item.path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(item.path);
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item);
    const showBadge = item.path === '/app/messages' && messageBadge;
    const useBrand = active && !!brandColor;
    const colorStyle: React.CSSProperties | undefined = useBrand
      ? { color: brandColor!, transition: 'color 220ms ease-out' }
      : undefined;

    return (
      <button
        onClick={() => handleNavClick(item)}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
          active ? (useBrand ? '' : 'text-primary') : "text-muted-foreground hover:text-foreground"
        )}
        style={colorStyle}
      >
        <div className="relative">
          <Icon className="h-6 w-6" />
          {showBadge && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
          )}
        </div>
      </button>
    );
  };

  return (
    <nav className="app-bottom-nav-transition fixed bottom-0 left-0 right-0 z-50 bg-card safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        <NavButton item={navItems[0]} />
        <NavButton item={navItems[1]} />
        <div className="flex flex-col items-center justify-center -mt-8">
          <button
            onClick={handleCenterButtonClick}
            data-scan-button
            className="relative flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transition-all text-white overflow-hidden"
            style={{
              height: '72px',
              width: '72px',
              background:
                'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
            }}
            aria-label="Scannen"
          >
            {/* Diagonal brand-color wash, animates from bottom-left → top-right
                whenever the active brand color changes (e.g. opening a Treuepass) */}
            {brandColor && (
              <span
                key={brandSweepKey}
                aria-hidden
                className="absolute inset-0 brand-sweep-in"
                style={{
                  background: brandColor,
                  // soft, narrow diagonal edge for a clean wipe with a hint of feather
                  WebkitMaskImage:
                    'linear-gradient(45deg, #000 calc(var(--sweep) - 4%), transparent calc(var(--sweep) + 2%))',
                  maskImage:
                    'linear-gradient(45deg, #000 calc(var(--sweep) - 4%), transparent calc(var(--sweep) + 2%))',
                }}
              />
            )}
            <Nfc className="relative" style={{ height: 36, width: 36 }} strokeWidth={2.2} />
          </button>
        </div>
        <NavButton item={navItems[2]} />
        <NavButton item={navItems[3]} />
      </div>
    </nav>
  );
};
