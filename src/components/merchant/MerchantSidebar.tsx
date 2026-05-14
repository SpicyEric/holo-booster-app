import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import {
  LayoutDashboard, Store, Users, Settings,
  LogOut, ChevronLeft, Menu, X,
  Gift, MessageSquare, ArrowLeft, BookOpen,
} from "lucide-react";
import eloyoLogo from "@/assets/eloyo-logo.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { useDemoMerchant } from "@/hooks/useDemoMerchant";
import { disableDemoMerchant } from "@/lib/demoMerchant";

interface NavItem {
  path: string;
  /** Optional ?tab= value — items sharing the same path are distinguished by this. */
  tab?: string;
  /** When path is shared with other items and there's no tab in URL, this item is the default match. */
  defaultForPath?: boolean;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/kunde", label: "Dashboard", icon: LayoutDashboard },
  { path: "/kunde/marketing", tab: "praemien", defaultForPath: true, label: "Treuepass", icon: Gift },
  { path: "/kunde/mein-geschaeft", tab: "info", defaultForPath: true, label: "Profil", icon: Store },
  { path: "/kunde/marketing", tab: "messages", label: "Nachrichten", icon: MessageSquare },
  
  { path: "/kunde/anleitung", label: "So funktioniert's", icon: BookOpen },
  { path: "/kunde/konto", label: "Einstellungen", icon: Settings },
];

function SidebarNav({ collapsed, onNavigate, companyName, subStatus, coverImageUrl, logoUrl }: { collapsed: boolean; onNavigate?: () => void; companyName?: string; subStatus?: string; coverImageUrl?: string | null; logoUrl?: string | null; }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  const isActive = (item: NavItem) => {
    if (item.path === "/kunde") return location.pathname === "/kunde" || location.pathname === "/kunde/";
    if (!location.pathname.startsWith(item.path)) return false;
    if (item.tab) {
      if (currentTab) return currentTab === item.tab;
      return !!item.defaultForPath;
    }
    return true;
  };

  const demoActive = useDemoMerchant();

  const handleLogout = async () => {
    if (demoActive) {
      const returnPath = disableDemoMerchant();
      navigate(returnPath, { replace: true });
      return;
    }
    const { error } = await signOut();
    if (error) {
      toast.error("Logout fehlgeschlagen");
    } else {
      toast.success("Erfolgreich abgemeldet");
      navigate("/auth");
    }
  };

  const handleNav = (item: NavItem) => {
    const target = item.tab ? `${item.path}?tab=${item.tab}` : item.path;
    navigate(target);
    onNavigate?.();
  };



  return (
    <>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={`${item.path}:${item.tab ?? ''}`}
              onClick={() => handleNav(item)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                "hover:bg-white/10 active:scale-[0.97]",
                active
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/60 hover:text-white",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />
              )}
              <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-white" : "text-white/50")} />
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Profile module at bottom — Treuepass-Karten-Vorschau */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {!collapsed && (
          <div
            className="relative w-full rounded-xl overflow-hidden shadow-md"
            style={{ aspectRatio: '1.55 / 1' }}
            title={companyName}
          >
            <div className="absolute inset-0">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt={companyName || 'Treuepass'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500" />
              )}
            </div>
            <div className="absolute top-2 left-2 z-20 w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/80">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{companyName?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <h3 className="text-white font-semibold text-sm truncate drop-shadow-md">{companyName}</h3>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.97]",
            demoActive
              ? "text-amber-200 hover:text-amber-100 hover:bg-amber-500/15 border border-amber-400/30"
              : "text-white/40 hover:text-red-300 hover:bg-white/10",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? (demoActive ? "Zurück zu meinem Konto" : "Logout") : undefined}
        >
          {demoActive ? <ArrowLeft className="h-4 w-4 shrink-0" /> : <LogOut className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>{demoActive ? "Zurück zu meinem Konto" : "Logout"}</span>}
        </button>
      </div>
    </>
  );
}

export default function MerchantSidebar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState<string>("");
  const [subStatus, setSubStatus] = useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      getUserCustomer(user.id).then(c => {
        if (c) {
          setCompanyName(c.company_name || c.name || "");
          setSubStatus(c.status || "active");
          setCoverImageUrl((c as any).cover_image_url ?? null);
          setLogoUrl((c as any).logo_url ?? null);
        }
      });
    }
  }, [user?.id]);

  // Mobile: hamburger + sheet
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-50 h-10 w-10 rounded-xl bg-card/80 backdrop-blur-sm shadow-sm border border-border/50"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-[hsl(var(--merchant-sidebar,262_50%_22%))] border-white/10">
            <div className="flex items-center justify-between h-16 border-b border-white/10 px-4">
              <img
                src={eloyoLogo}
                alt="Eloyo"
                className="h-7 w-auto cursor-pointer brightness-0 invert"
                onClick={() => { navigate("/kunde"); setMobileOpen(false); }}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} companyName={companyName} subStatus={subStatus} coverImageUrl={coverImageUrl} logoUrl={logoUrl} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: persistent sidebar
  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r border-white/5 bg-[hsl(var(--merchant-sidebar,262_50%_22%))] transition-all duration-300 z-20 shrink-0",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className={cn(
        "flex items-center h-16 border-b border-white/10 px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <img
            src={eloyoLogo}
            alt="Eloyo"
            className="h-7 w-auto cursor-pointer brightness-0 invert"
            onClick={() => navigate("/kunde")}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
        </Button>
      </div>

      <SidebarNav collapsed={collapsed} companyName={companyName} subStatus={subStatus} coverImageUrl={coverImageUrl} logoUrl={logoUrl} />
    </aside>
  );
}
