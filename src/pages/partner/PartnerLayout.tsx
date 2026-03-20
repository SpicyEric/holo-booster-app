import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';
import { LogOut, LayoutDashboard, Users, Euro, Menu, ShoppingCart } from 'lucide-react';
import { WebProtectedRoute } from '@/components/WebProtectedRoute';
import eloyoLogo from '@/assets/eloyo-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const menuItems = [
  { to: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/partner/leads', label: 'Meine Leads', icon: Users },
  { to: '/partner/provisionen', label: 'Provisionen', icon: Euro },
];

export default function PartnerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('ccm19-right');
    return () => { document.body.classList.remove('ccm19-right'); };
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success('Erfolgreich abgemeldet');
    navigate('/auth');
  };

  const currentPage = menuItems.find(item =>
    location.pathname === item.to ||
    (item.to === '/partner/dashboard' && location.pathname === '/partner/dashboard')
  );

  return (
    <WebProtectedRoute allowedRoles={['partner', 'sales_partner', 'admin'] as any}>
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <header className="sticky top-0 z-40 w-full border-b bg-background">
          <div className="flex h-16 items-center gap-4 px-6">
            <img src={eloyoLogo} alt="Eloyo Logo" className="h-8 w-auto" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Menu className="h-4 w-4" />
                  <span className="hidden md:inline">{currentPage?.label || 'Navigation'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background">
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className="cursor-pointer gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => navigate('/partner/checkout')}
              size="sm"
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden md:inline">Kunde abschließen</span>
              <span className="md:hidden">Abschluss</span>
            </Button>

            <div className="flex-1" />

            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </div>
    </WebProtectedRoute>
  );
}
