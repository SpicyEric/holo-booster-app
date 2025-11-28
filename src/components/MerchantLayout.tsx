import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Star, CreditCard } from "lucide-react";
import eloyoLogo from '@/assets/eloyo-logo.png';
import Particles from "@/components/Particles";
import { cn } from "@/lib/utils";

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
      path: '/kunde/stempelkarte', 
      label: 'Stempelkarte', 
      icon: CreditCard 
    },
    { 
      path: '/kunde/google-bewertungen', 
      label: 'Google-Bewertungen', 
      icon: Star 
    },
  ];

  const isActive = (path: string) => location.pathname === path;

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
            <div className="flex items-center gap-6">
              <img 
                src={eloyoLogo} 
                alt="Eloyo Logo" 
                className="h-10 w-auto cursor-pointer" 
                onClick={() => navigate('/kunde/dashboard')}
              />
              
              {/* Navigation */}
              <nav className="hidden sm:flex items-center gap-1">
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "gap-2",
                      isActive(item.path) && "bg-primary/10 text-primary"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </div>
            
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>
          
          {/* Mobile Navigation */}
          <div className="sm:hidden border-t border-border px-4 py-2 flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className={cn(
                  "gap-2 whitespace-nowrap",
                  isActive(item.path) && "bg-primary/10 text-primary"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
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
