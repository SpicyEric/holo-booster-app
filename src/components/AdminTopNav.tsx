import { Home, Users, BarChart3, Settings, LogOut, UserCog, ShoppingCart, Menu, Package, Box, Map } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import eloyoLogo from '@/assets/eloyo-logo.png';

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Kunden", url: "/admin/customers", icon: Users },
  { title: "Karte", url: "/admin/map", icon: Map },
  { title: "Box-IDs", url: "/admin/boxes", icon: Box },
  { title: "Bestellungen & Vorschläge", url: "/admin/orders", icon: Package },
  { title: "Accounts", url: "/admin/accounts", icon: UserCog },
  { title: "Statistiken", url: "/admin/stats", icon: BarChart3 },
  { title: "Kunde abschließen", url: "/admin/checkout", icon: ShoppingCart },
  { title: "Einstellungen", url: "/admin/settings", icon: Settings },
];

export function AdminTopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Logout fehlgeschlagen");
    } else {
      toast.success("Erfolgreich abgemeldet");
      navigate("/auth");
    }
  };

  const currentPage = menuItems.find(item => 
    location.pathname === item.url || 
    (item.url === "/admin" && location.pathname === "/admin")
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="flex h-16 items-center gap-4 px-6">
        <img src={eloyoLogo} alt="Eloyo Logo" className="h-8 w-auto" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Menu className="h-4 w-4" />
              <span className="hidden md:inline">{currentPage?.title || "Navigation"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background">
            {menuItems.map((item) => (
              <DropdownMenuItem
                key={item.title}
                onClick={() => navigate(item.url)}
                className="cursor-pointer gap-2"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <Button variant="ghost" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
