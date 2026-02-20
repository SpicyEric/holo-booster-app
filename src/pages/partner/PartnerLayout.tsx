import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';
import { LogOut, LayoutDashboard, Users, PlusCircle, Euro } from 'lucide-react';
import { WebProtectedRoute } from '@/components/WebProtectedRoute';
import eloyoLogo from '@/assets/eloyo-logo.png';

const navItems = [
  { to: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/partner/leads', label: 'Meine Leads', icon: Users },
  { to: '/partner/leads/new', label: 'Neuer Lead', icon: PlusCircle },
  { to: '/partner/provisionen', label: 'Provisionen', icon: Euro },
];

export default function PartnerLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Erfolgreich abgemeldet');
    navigate('/auth');
  };

  return (
    <WebProtectedRoute allowedRoles={['partner', 'sales_partner', 'admin'] as any}>
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="border-b bg-card sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img src={eloyoLogo} alt="Logo" className="h-8 w-auto" />
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/partner/dashboard'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-b bg-card px-4 py-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/partner/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </div>
    </WebProtectedRoute>
  );
}
