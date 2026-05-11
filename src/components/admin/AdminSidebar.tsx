import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Box, Package, UserCog, BarChart3,
  ShoppingCart, Settings, LogOut, ChevronLeft, Menu, X, Map, GitBranch, Search, Lightbulb, CalendarDays, UserPlus, Truck, RotateCcw, Receipt, FileText, FileSignature, Bell, Globe, Eye, GraduationCap, Sparkles,
} from "lucide-react";
import eloyoLogo from "@/assets/eloyo-logo.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { enableDemoMerchant } from "@/lib/demoMerchant";
import { endDemoOnboardingTour } from "@/lib/demoOnboardingTour";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  /** If true, group is always open and not collapsible (e.g. ÜBERSICHT). */
  alwaysOpen?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "ÜBERSICHT",
    alwaysOpen: true,
    items: [
      { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { path: "/admin/stats", label: "Statistiken", icon: BarChart3 },
    ],
  },
  {
    label: "SALES",
    alwaysOpen: true,
    items: [
      { path: "/admin/store-finder", label: "Store Finder", icon: Search },
      { path: "/admin/leads", label: "Kontakte", icon: Users },
      { path: "/admin/lead-pipeline", label: "Pipeline", icon: GitBranch },
      { path: "/admin/calendar", label: "Kalender", icon: CalendarDays },
      { path: "/admin/customers", label: "Kunden", icon: Users },
      { path: "/admin/checkout", label: "Kunde abschließen", icon: ShoppingCart },
    ],
  },
  {
    label: "OPERATIONS",
    alwaysOpen: true,
    items: [
      { path: "/admin/boxes", label: "Box-IDs", icon: Box },
      { path: "/admin/orders", label: "Nachrichten", icon: Package },
    ],
  },
  {
    label: "VERTRIEB",
    alwaysOpen: true,
    items: [
      { path: "/admin/sales-reps", label: "Vertriebler", icon: Users },
      { path: "/admin/sales-rep-register", label: "Vertriebler registrieren", icon: UserPlus },
      { path: "/admin/box-orders", label: "Bestellungen", icon: Truck },
      { path: "/admin/box-returns", label: "Boxenrücknahme", icon: RotateCcw },
      { path: "/admin/gutschriften", label: "Gutschriften", icon: Receipt },
      { path: "/admin/vertragsversionen", label: "Vertragsversionen", icon: FileSignature },
      { path: "/admin/zusatzvereinbarungen", label: "Zusatzvereinbarungen", icon: FileText },
    ],
  },
  {
    label: "SYSTEM",
    alwaysOpen: true,
    items: [
      { path: "/admin/accounts", label: "User-Accounts", icon: UserCog },
      { path: "/admin/push", label: "Push", icon: Bell },
      { path: "/admin/website-checkout", label: "Website", icon: Globe },
      { path: "/admin/settings", label: "Einstellungen", icon: Settings },
    ],
  },
  {
    label: "ACADEMY",
    alwaysOpen: true,
    items: [
      { path: "/admin/academy", label: "Quick Onboarding", icon: GraduationCap },
      { path: "/admin/demo-abschluss", label: "Demo Abschluss", icon: Sparkles },
      { path: "__demo_merchant__", label: "Demo Merchant", icon: Eye },
    ],
  },
];

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin" || location.pathname === "/admin/";
    return location.pathname.startsWith(path);
  };

  const groupHasActive = (group: NavGroup) => group.items.some((i) => isActive(i.path));

  // Track open state per collapsible group; auto-open the group containing the active route.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      if (!g.alwaysOpen) init[g.label] = groupHasActive(g);
    });
    return init;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      NAV_GROUPS.forEach((g) => {
        if (!g.alwaysOpen && groupHasActive(g)) next[g.label] = true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Logout fehlgeschlagen");
    } else {
      toast.success("Erfolgreich abgemeldet");
      navigate("/auth");
    }
  };

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-3 scrollbar-hide">
        {NAV_GROUPS.map((group) => {
          const hasActive = groupHasActive(group);
          const isOpen = group.alwaysOpen || collapsed || openGroups[group.label];

          return (
            <div key={group.label}>
              {!collapsed && (
                group.alwaysOpen ? (
                  <p className="text-[10px] font-bold tracking-[0.12em] text-white/40 uppercase mb-2 px-3 font-headline">
                    {group.label}
                  </p>
                ) : (
                  <button
                    onClick={() => setOpenGroups((p) => ({ ...p, [group.label]: !p[group.label] }))}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-3 py-1.5 mb-1 transition-colors group",
                      "hover:bg-white/5"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold tracking-[0.12em] uppercase font-headline transition-colors",
                      hasActive ? "text-white/70" : "text-white/40 group-hover:text-white/60"
                    )}>
                      {group.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-white/40 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )} />
                  </button>
                )
              )}
              {isOpen && (
                <div className={cn("space-y-1", !group.alwaysOpen && !collapsed && "animate-accordion-down")}>
                  {group.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative font-body",
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
                        {!collapsed && <span>{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-2">
        <button
          onClick={() => {
            enableDemoMerchant(location.pathname || "/admin");
            navigate("/kunde");
            onNavigate?.();
          }}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.97]",
            "bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100 border border-amber-400/20 font-body",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Demo Merchant" : undefined}
        >
          <Eye className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Demo Merchant</span>}
        </button>

        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-white/90 font-headline">Admin Panel</p>
            <p className="text-[11px] text-white/40 font-body">Systemverwaltung</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-white/40 hover:text-red-300 hover:bg-white/10 transition-all duration-200 active:scale-[0.97] font-body",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-[hsl(262,50%,28%)] border-r border-white/10 shadow-xl">
            <div className="flex items-center justify-between h-16 border-b border-white/10 px-4">
              <img
                src={eloyoLogo}
                alt="Eloyo"
                className="h-7 w-auto cursor-pointer brightness-0 invert"
                onClick={() => { navigate("/admin"); setMobileOpen(false); }}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r border-white/10 bg-[hsl(262,50%,28%)] transition-all duration-300 z-20 shrink-0 shadow-lg",
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
            onClick={() => navigate("/admin")}
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

      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
