import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Home, Building2, Star, MessageSquare, User, Menu, ArrowLeftRight } from "lucide-react";
import eloyoLogo from '@/assets/eloyo-logo.png';
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
    { path: '/kunde/mein-geschaeft', label: 'Mein Geschäft', icon: Building2 },
    { path: '/kunde/transaktionen', label: 'Transaktionen', icon: ArrowLeftRight },
    { path: '/kunde/google-bewertungen', label: 'Google-Bewertungen', icon: Star },
    { path: '/kunde/nachrichten', label: 'Kampagnen', icon: MessageSquare },
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
      {/* Pure white background - no particles */}
      <div className="min-h-screen bg-white">
        {/* Clean header */}
        <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <img 
              src={eloyoLogo} 
              alt="Eloyo Logo" 
              className="h-8 w-auto cursor-pointer" 
              onClick={() => navigate('/kunde')}
            />
            
            {/* Dropdown Navigation */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="gap-2 border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    <Menu className="h-4 w-4" />
                    Menü
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-100 shadow-lg rounded-xl">
                  {navItems.map((item) => (
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`cursor-pointer rounded-lg mx-1 ${
                        isActive(item.path) 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg mx-1"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main>
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default MerchantLayout;
