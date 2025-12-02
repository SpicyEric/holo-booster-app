import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Home, Building2, Star, CreditCard, MessageSquare, User, Menu, Stamp } from "lucide-react";
import eloyoLogo from '@/assets/eloyo-logo.png';
import Particles from "@/components/Particles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MerchantLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Logout fehlgeschlagen");
    } else {
      toast.success("Erfolgreich abgemeldet");
      navigate('/auth');
    }
  };

  const navItems = [
    { path: '/kunde', label: 'Dashboard', icon: Home },
    { path: '/kunde/geschaeftsinformationen', label: 'Geschäftsinformationen', icon: Building2 },
    { path: '/kunde/stempel', label: 'Stempel', icon: Stamp },
    { path: '/kunde/google-bewertungen', label: 'Google-Bewertungen', icon: Star },
    { path: '/kunde/zahlungen', label: 'Zahlungen', icon: CreditCard },
    { path: '/kunde/nachrichten', label: 'Nachrichten & Angebote', icon: MessageSquare },
    { path: '/kunde/konto', label: 'Mein Konto', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/kunde') {
      return location.pathname === '/kunde' || location.pathname === '/kunde/';
    }
    return location.pathname === path;
  };

  return (
    <ProtectedRoute allowedRoles={['merchant', 'admin']}>
      <div className="min-h-screen bg-background">
        <Particles 
          particleColors={['#8B5CF6', '#3B82F6', '#8B5CF6']}
          particleCount={100}
          particleSpread={8}
          speed={0.05}
          particleBaseSize={100}
          sizeRandomness={1.5}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
          cameraDistance={20}
        />
        
        {/* Header with dropdown navigation */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <img 
              src={eloyoLogo} 
              alt="Eloyo Logo" 
              className="h-9 w-auto cursor-pointer" 
              onClick={() => navigate('/kunde')}
            />
            
            {/* Dropdown Navigation */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Menu className="h-4 w-4" />
                    Menü
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border shadow-lg">
                  {navItems.map((item) => (
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`cursor-pointer ${isActive(item.path) ? 'bg-primary/10 text-primary font-medium' : ''}`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="relative z-10">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default MerchantLayout;
