import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Star, CreditCard, Home, User } from "lucide-react";
import eloyoLogo from '@/assets/eloyo-logo.png';
import Particles from "@/components/Particles";

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
    { path: '/kunde/stempelkarte', label: 'Stempelkarte', icon: CreditCard },
    { path: '/kunde/google-bewertungen', label: 'Google-Bewertungen', icon: Star },
    { path: '/kunde/konto', label: 'Mein Konto', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/kunde') {
      return location.pathname === '/kunde' || location.pathname === '/kunde/';
    }
    return location.pathname === path;
  };

  return (
    <ProtectedRoute allowedRoles={['kunde', 'admin']}>
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
        
        {/* Header with inline navigation */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <img 
              src={eloyoLogo} 
              alt="Eloyo Logo" 
              className="h-9 w-auto cursor-pointer" 
              onClick={() => navigate('/kunde')}
            />
            
            {/* Inline Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              ))}
              <div className="w-px h-6 bg-border mx-2 hidden sm:block" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </nav>
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
