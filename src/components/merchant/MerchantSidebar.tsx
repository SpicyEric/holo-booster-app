import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import {
  LayoutDashboard, Store, Users, Megaphone, Settings,
  LogOut, ChevronLeft, ChevronDown, Menu, X, Building2,
  Gift, Rocket, UserPlus, Star, MessageSquare, Zap, Info, Package,
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

interface NavItem {
  path: string;
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
      {
        path: "/kunde/mein-geschaeft",
        label: "Mein Geschäft",
        icon: Store,
        subItems: [
          { tab: "info", label: "Profil", icon: Info },
          { tab: "stempel", label: "System", icon: Package },
        ],
      },
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

  const isActive = (path: string) => {
    if (path === "/kunde") return location.pathname === "/kunde" || location.pathname === "/kunde/";
    return location.pathname.startsWith(path);
  };

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
              <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-2 px-3">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.path);
                const showSubItems = active && !collapsed && item.subItems && item.subItems.length > 0;
                return (
                  <div key={item.path}>
                    <button
                      onClick={() => handleNav(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                        "hover:bg-primary/5 active:scale-[0.97]",
                        active
                          ? "bg-gradient-to-r from-primary/10 to-secondary/5 text-primary shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                      )}
                      <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-primary" : "text-slate-400")} />
                      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {!collapsed && item.subItems && (
                        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", showSubItems && "rotate-180")} />
                      )}
                    </button>

                    {showSubItems && (
                      <div className="mt-1 ml-3 pl-3 border-l border-primary/15 space-y-0.5 animate-accordion-down">
                        {item.subItems!.map((sub) => {
                          const subActive = currentTab === sub.tab || (!currentTab && sub.tab === item.subItems![0].tab);
                          return (
                            <button
                              key={sub.tab}
                              onClick={() => handleSubNav(item.path, sub.tab)}
                              className={cn(
                                "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 active:scale-[0.97]",
                                subActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                              )}
                            >
                              <sub.icon className={cn("h-3.5 w-3.5 shrink-0", subActive ? "text-primary" : "text-slate-400")} />
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
      <div className="border-t border-white/30 p-3 space-y-2">
        {!collapsed && companyName && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{companyName}</p>
                <p className="text-[11px] text-slate-400">
                  {subStatus === 'active' ? '● Abo aktiv' : subStatus === 'paused' ? '● Pausiert' : '● Status unbekannt'}
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-all duration-200 active:scale-[0.97]",
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
          className="fixed top-3 left-3 z-50 h-10 w-10 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-white/40"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-gradient-to-b from-white/95 via-[hsl(262,60%,97%)]/95 to-[hsl(262,50%,94%)]/95 backdrop-blur-xl border-white/30">
            <div className="flex items-center justify-between h-16 border-b border-white/40 px-4">
              <img
                src={eloyoLogo}
                alt="Eloyo"
                className="h-7 w-auto cursor-pointer"
                onClick={() => { navigate("/kunde"); setMobileOpen(false); }}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100/50" onClick={() => setMobileOpen(false)}>
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
