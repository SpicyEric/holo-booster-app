import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, User, FileText, MessageSquare, Star, LogOut, Home, ShoppingBag, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import eloyoLogo from '@/assets/eloyo-logo.png';

export function CustomerHeader() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const menuItems = [
    { label: "Dashboard", icon: Home, path: "/customer" },
    { label: "Analytics", icon: BarChart3, path: "/customer/analytics" },
    { label: "SMS-Kampagnen", icon: MessageSquare, path: "/customer/sms-campaigns" },
    { label: "Google-Bewertungen löschen", icon: Star, path: "/customer/google-reviews" },
    { label: "Kontoinformationen", icon: User, path: "/customer/account" },
    { label: "Shop", icon: ShoppingBag, path: "/customer/upgrade" },
    { label: "Rechnungen", icon: FileText, path: "/customer/invoices" },
  ];

  return (
    <header className="border-b relative z-10 bg-background/80 backdrop-blur-sm sticky top-0">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <img 
          src={eloyoLogo} 
          alt="Eloyo Logo"
          className="h-10 w-auto cursor-pointer" 
          onClick={() => navigate('/customer')}
        />
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-background">
            <SheetHeader>
              <SheetTitle>Menü</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="justify-start gap-3 w-full"
                    onClick={() => navigate(item.path)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
              <div className="pt-4 border-t mt-4">
                <Button
                  variant="ghost"
                  className="justify-start gap-3 w-full text-destructive hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}