import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Gift, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mobile-optimized layout for end customer app
 * Bottom navigation, no admin overhead
 */
export const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/app', icon: Home, label: 'Home' },
    { path: '/app/rewards', icon: Gift, label: 'Prämien' },
    { path: '/app/history', icon: Clock, label: 'Verlauf' },
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
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full transition-colors",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 mb-1", active && "stroke-[2.5]")} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
