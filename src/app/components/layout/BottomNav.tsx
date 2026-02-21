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

  // Check for unread messages or unverified email
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

      setMessageBadge((unreadCount || 0) > 0 || profile?.email_verified === false);
    };

    checkBadge();
    // Recheck every 30 seconds
    const interval = setInterval(checkBadge, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems: NavItem[] = [
    { icon: Home, label: 'Start', path: '/app', index: 0 },
    { icon: MessageSquare, label: 'Nachrichten', path: '/app/messages', index: 1 },
    { icon: Store, label: 'Stores', path: '/app/stores', index: 2 },
    { icon: Settings, label: 'Einstellungen', path: '/app/profile', index: 3 },
  ];

  const handleCenterButtonClick = () => {
    navigate('/app/scan');
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
            <Stamp className="h-11 w-11" strokeWidth={2.5} />
          </Button>
        </div>
        <NavButton item={navItems[2]} />
        <NavButton item={navItems[3]} />
      </div>
    </nav>
  );
};
