import { useEffect, useState } from 'react';
import { Home, MessageSquare, Store, Settings, Stamp, LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  // Check for unread messages, unverified email, or unseen redeemable rewards
  useEffect(() => {
    if (!user) return;

    const checkBadge = async () => {
      // Check unread messages
      const { count: unreadCount } = await supabase
        .from('app_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      // Check email verification
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('user_id', user.id)
        .maybeSingle();

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
          if (redeemableCount > 0) {
            const lastSeen = localStorage.getItem(`rewards_seen_${user.id}`);
            // If never seen or rewards changed since last seen
            if (!lastSeen) {
              hasUnseenRewards = true;
            }
          }
        }
      }

      setMessageBadge((unreadCount || 0) > 0 || profile?.email_verified !== true || hasUnseenRewards);
    };

    checkBadge();
    const interval = setInterval(checkBadge, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems: NavItem[] = [
    { icon: Home, label: 'Feed', path: '/app', index: 0 },
    { icon: Store, label: 'Stores', path: '/app/stores', index: 1 },
    { icon: MessageSquare, label: 'Nachrichten', path: '/app/messages', index: 2 },
    { icon: Settings, label: 'Einstellungen', path: '/app/profile', index: 3 },
  ];

  const handleCenterButtonClick = () => {
    navigate('/app/scan?autostart=true');
  };

  const handleNavClick = (item: NavItem) => {
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
    
    return (
      <button
        onClick={() => handleNavClick(item)}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="relative">
          <Icon className="h-6 w-6" />
          {showBadge && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
          )}
        </div>
        <span className="text-xs mt-1">{item.label}</span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        <NavButton item={navItems[0]} />
        <NavButton item={navItems[1]} />
        <div className="flex flex-col items-center justify-center -mt-8">
          <Button
            size="icon"
            onClick={handleCenterButtonClick}
            className="h-18 w-18 rounded-full shadow-lg bg-gradient-to-br from-primary to-secondary hover:shadow-xl transition-all"
            style={{ height: '72px', width: '72px' }}
          >
            <Stamp className="h-10 w-10" strokeWidth={2} style={{ width: '40px', height: '40px' }} />
          </Button>
        </div>
        <NavButton item={navItems[2]} />
        <NavButton item={navItems[3]} />
      </div>
    </nav>
  );
};
