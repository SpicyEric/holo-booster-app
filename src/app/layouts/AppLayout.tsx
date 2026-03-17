import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Gift, User, Scan, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOfflineSync } from '@/app/hooks/useOfflineSync';

/**
 * Mobile-optimized layout for end customer app
 * Bottom navigation, no admin overhead
 */
export const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useOfflineSync(); // Auto-sync pending offline stamps

  const navItems = [
    { path: '/app', icon: Home, label: 'Feed' },
    { path: '/app/stores', icon: Store, label: 'Stores' },
    { path: '/app/scan', icon: Scan, label: 'Scannen', highlight: true },
    { path: '/app/rewards', icon: Gift, label: 'Prämien' },
    { path: '/app/profile', icon: User, label: 'Profil' },
  ];

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            const isHighlight = (item as any).highlight;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full transition-colors",
                  isHighlight && !active && "text-primary",
                  active 
                    ? "text-primary" 
                    : !isHighlight && "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center mb-1",
                  isHighlight && "bg-primary text-primary-foreground rounded-full p-2 -mt-4 shadow-lg"
                )}>
                  <Icon className={cn(
                    isHighlight ? "h-6 w-6" : "h-5 w-5",
                    active && !isHighlight && "stroke-[2.5]"
                  )} />
                </div>
                <span className={cn("text-xs font-medium", isHighlight && "-mt-1")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
