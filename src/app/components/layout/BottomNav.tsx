import { Home, MessageSquare, Store, Settings, Stamp, LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { icon: Home, label: 'Start', path: '/app' },
    { icon: MessageSquare, label: 'Nachrichten', path: '/app/messages' },
    { icon: Store, label: 'Stores', path: '/app/stores' },
    { icon: Settings, label: 'Einstellungen', path: '/app/profile' },
  ];

  const handleCenterButtonClick = () => {
    navigate('/app/scan');
  };

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full transition-colors",
          isActive(item.path)
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-6 w-6" />
        <span className="text-xs mt-1">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Home */}
        <NavLink item={navItems[0]} />

        {/* Messages */}
        <NavLink item={navItems[1]} />

        {/* Central Stamp Button - bigger icon */}
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

        {/* Stores */}
        <NavLink item={navItems[2]} />

        {/* Settings/Profile */}
        <NavLink item={navItems[3]} />
      </div>
    </nav>
  );
};
