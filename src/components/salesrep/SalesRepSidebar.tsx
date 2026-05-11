import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Package, BarChart3, Euro, Mail, Receipt, FileText,
  ShoppingCart, Settings, LogOut, ChevronLeft, ChevronDown, Menu, X, Map, GitBranch, Search, CalendarDays, Eye, GraduationCap, Sparkles,
} from "lucide-react";
import eloyoLogo from "@/assets/eloyo-logo.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
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
  alwaysOpen?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "ÜBERSICHT",
    alwaysOpen: true,
    items: [
      { path: "/vertriebler", label: "Dashboard", icon: LayoutDashboard },
      { path: "/vertriebler/provisionen", label: "Provisionen", icon: Euro },
      { path: "/vertriebler/stats", label: "Statistiken", icon: BarChart3 },
    ],
  },
  {
    label: "SALES",
    alwaysOpen: true,
    items: [
      { path: "/vertriebler/store-finder", label: "Store Finder", icon: Search },
      { path: "/vertriebler/leads", label: "Kontakte", icon: Users },
      { path: "/vertriebler/lead-pipeline", label: "Pipeline", icon: GitBranch },
      { path: "/vertriebler/calendar", label: "Kalender", icon: CalendarDays },
      { path: "/vertriebler/customers", label: "Meine Kunden", icon: Users },
      { path: "/vertriebler/checkout", label: "Kunde abschließen", icon: ShoppingCart },
    ],
  },
  {
    label: "KOMMUNIKATION",
    alwaysOpen: true,
    items: [
      { path: "/vertriebler/messages", label: "Nachrichten", icon: Mail },
      { path: "/vertriebler/orders", label: "Bestellung", icon: Package },
    ],
  },
  {
    label: "SYSTEM",
    alwaysOpen: true,
    items: [
      { path: "/vertriebler/mein-vertrag", label: "Mein Vertrag", icon: FileText },
      { path: "/vertriebler/abrechnungen", label: "Meine Abrechnungen", icon: Receipt },
      { path: "/vertriebler/settings", label: "Einstellungen", icon: Settings },
    ],
  },
  {
    label: "ACADEMY",
    alwaysOpen: true,
    items: [
      { path: "/vertriebler/academy", label: "Quick Onboarding", icon: GraduationCap },
      { path: "/vertriebler/demo-abschluss", label: "Demo Abschluss", icon: Sparkles },
      { path: "__demo_merchant__", label: "Demo Merchant", icon: Eye },
    ],
  },
];

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    const [pathOnly, query] = path.split("?");
    if (pathOnly === "/vertriebler") {
      return location.pathname === "/vertriebler" || location.pathname === "/vertriebler/";
    }
    if (query) {
      // Match exact pathname + query param
      const params = new URLSearchParams(query);
      const tab = params.get("tab");
      const currentTab = new URLSearchParams(location.search).get("tab") || "funktion";
      return location.pathname === pathOnly && (tab === currentTab || (tab === "funktion" && !currentTab));
    }
    return location.pathname.startsWith(pathOnly);
  };

  const groupHasActive = (group: NavGroup) => group.items.some((i) => isActive(i.path));

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
    if (path === "__demo_merchant__") {
      endDemoOnboardingTour();
      enableDemoMerchant(location.pathname || "/vertriebler");
      navigate("/kunde");
      onNavigate?.();
      return;
    }
    navigate(path);
    onNavigate?.();
  };

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-3">
        {NAV_GROUPS.map((group) => {
          const hasActive = groupHasActive(group);
          const isOpen = group.alwaysOpen || collapsed || openGroups[group.label];

          return (
            <div key={group.label}>
              {!collapsed && (
                group.alwaysOpen ? (
                  <p className="text-[10px] font-bold tracking-[0.12em] text-white/40 uppercase mb-2 px-3">
                    {group.label}
                  </p>
                ) : (
                  <button
                    onClick={() => setOpenGroups((p) => ({ ...p, [group.label]: !p[group.label] }))}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-1.5 mb-1 transition-colors group hover:bg-white/5"
                  >
                    <span className={cn(
                      "text-[10px] font-bold tracking-[0.12em] uppercase transition-colors",
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
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-white/90">Vertrieb</p>
            <p className="text-[11px] text-white/40">Vertriebspartner</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-white/40 hover:text-red-300 hover:bg-white/10 transition-all duration-200 active:scale-[0.97]",
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

export default function SalesRepSidebar() {
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
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-[hsl(262,50%,22%)] border-white/10">
            <div className="flex items-center justify-between h-16 border-b border-white/10 px-4">
              <img
                src={eloyoLogo}
                alt="Eloyo"
                className="h-7 w-auto cursor-pointer brightness-0 invert"
                onClick={() => { navigate("/vertriebler"); setMobileOpen(false); }}
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
        "sticky top-0 h-screen flex flex-col border-r border-white/5 bg-[hsl(262,50%,22%)] transition-all duration-300 z-20 shrink-0",
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
            onClick={() => navigate("/vertriebler")}
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
