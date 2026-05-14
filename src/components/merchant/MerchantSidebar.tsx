import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import {
  LayoutDashboard, Store, Users, Megaphone, Settings,
  LogOut, ChevronLeft, ChevronDown, Menu, X, Building2,
  Gift, Rocket, UserPlus, Star, MessageSquare, Zap, Info, Package, ArrowLeft,
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
  label: string;
  icon: React.ElementType;
  /** Optional sub-items shown when parent is active/expanded. Each maps to `?tab=` on the parent path. */
  subItems?: { tab: string; label: string; icon: React.ElementType }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "BUSINESS",
    items: [
      { path: "/kunde", label: "Dashboard", icon: LayoutDashboard },
      { path: "/kunde/mein-geschaeft", tab: "info", label: "Profil", icon: Store },
      { path: "/kunde/mein-geschaeft", tab: "karte", label: "Punktesystem", icon: Package },
    ],
  },
  {
    label: "AKTIVITÄT",
    items: [
      { path: "/kunde/kunden", label: "Kunden & Transaktionen", icon: Users },
    ],
  },
  {
    label: "WACHSTUM",
    items: [
      {
        path: "/kunde/marketing",
        label: "Marketing",
        icon: Megaphone,
        subItems: [
          { tab: "praemien", label: "Prämien", icon: Gift },
          { tab: "referral", label: "Empfehlungen", icon: UserPlus },
          { tab: "boost", label: "Neukunden", icon: Rocket },
          { tab: "messages", label: "Nachrichten", icon: MessageSquare },
          { tab: "automations", label: "Automationen", icon: Zap },
          { tab: "reviews", label: "Bewertungen", icon: Star },
        ],
      },
    ],
  },
  {
    label: "EINSTELLUNGEN",
    items: [
      { path: "/kunde/konto", label: "Konto", icon: Settings },
    ],
  },
];

function SidebarNav({ collapsed, onNavigate, companyName, subStatus }: { collapsed: boolean; onNavigate?: () => void; companyName?: string; subStatus?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  const isActive = (item: NavItem) => {
    if (item.path === "/kunde") return location.pathname === "/kunde" || location.pathname === "/kunde/";
    if (!location.pathname.startsWith(item.path)) return false;
    if (item.tab) {
      // Sibling items on same path are distinguished by ?tab= (default = "info")
      return (currentTab || "info") === item.tab;
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

  const handleSubNav = (path: string, tab: string) => {
    navigate(`${path}?tab=${tab}`);
    onNavigate?.();
  };

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold tracking-[0.12em] text-white/40 uppercase mb-2 px-3">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item);
                const showSubItems = active && !collapsed && item.subItems && item.subItems.length > 0;
                return (
                  <div key={`${item.path}:${item.tab ?? ''}`}>
                    <button
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
                      {!collapsed && item.subItems && (
                        <ChevronDown className={cn("h-3.5 w-3.5 text-white/40 transition-transform", showSubItems && "rotate-180")} />
                      )}
                    </button>

                    {showSubItems && (
                      <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5 animate-accordion-down">
                        {item.subItems!.map((sub) => {
                          const subActive = currentTab === sub.tab || (!currentTab && sub.tab === item.subItems![0].tab);
                          return (
                            <button
                              key={sub.tab}
                              onClick={() => handleSubNav(item.path, sub.tab)}
                              className={cn(
                                "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 active:scale-[0.97]",
                                subActive
                                  ? "bg-white/10 text-white"
                                  : "text-white/50 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <sub.icon className={cn("h-3.5 w-3.5 shrink-0", subActive ? "text-white" : "text-white/40")} />
                              <span>{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile module at bottom */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {!collapsed && companyName && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-white/80" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{companyName}</p>
                <p className="text-[11px] text-white/40">
                  {subStatus === 'active' ? '● Abo aktiv' : subStatus === 'paused' ? '● Pausiert' : '● Status unbekannt'}
                </p>
              </div>
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

  useEffect(() => {
    if (user?.id) {
      getUserCustomer(user.id).then(c => {
        if (c) {
          setCompanyName(c.company_name || c.name || "");
          setSubStatus(c.status || "active");
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
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} companyName={companyName} subStatus={subStatus} />
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

      <SidebarNav collapsed={collapsed} companyName={companyName} subStatus={subStatus} />
    </aside>
  );
}
