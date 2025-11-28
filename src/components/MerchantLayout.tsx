import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Star, CreditCard, Home, User, Menu } from "lucide-react";
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
    { 
      path: '/kunde', 
      label: 'Dashboard', 
      icon: Home 
    },
    { 
      path: '/kunde/stempelkarte', 
      label: 'Stempelkarte', 
      icon: CreditCard 
    },
    { 
      path: '/kunde/google-bewertungen', 
      label: 'Google-Bewertungen', 
      icon: Star 
    },
    { 
      path: '/kunde/konto', 
      label: 'Mein Konto', 
      icon: User 
    },
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
        
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <img 
              src={eloyoLogo} 
              alt="Eloyo Logo" 
              className="h-10 w-auto cursor-pointer" 
              onClick={() => navigate('/kunde')}
            />
            
            {/* Dropdown Menu - Right Side */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background">
                {navItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={isActive(item.path) ? "bg-primary/10 text-primary" : ""}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
