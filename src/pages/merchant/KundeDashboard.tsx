import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Users, Trophy, Gift, Zap, TrendingUp,
  AlertTriangle, Pause, Clock, Star, Image, MapPin, Megaphone,
  Sparkles, ChevronRight, Target, CheckCircle2, Circle,
  Store, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer { id: string; name: string; email: string; company_name: string | null; status: string; customer_number: number | null; }
interface SubscriptionInfo { hasSubscription: boolean; status?: string; currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean; cancelAt?: string | null; }
interface DashboardStats { totalContacts: number; totalStamps: number; totalRedemptions: number; networkEffect: number; newContacts7Days: number; }

const DEMO_MERCHANT_ID = "e8e3db26-fd15-455a-ad47-50ed25081e3c";
const DEMO_STATS: DashboardStats = { totalContacts: 2400, totalStamps: 93000, totalRedemptions: 800, networkEffect: 600, newContacts7Days: 47 };

const KpiCard = ({ icon: Icon, label, value, sub, trend, iconBg, iconColor }: { icon: React.ElementType; label: string; value: string; sub?: string; trend?: string; iconBg: string; iconColor: string }) => (
  <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.4)] transition-all duration-300 group">
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105", iconBg)}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>
      )}
    </div>
    <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
    {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
  </div>
);

interface Mission { label: string; description: string; completed: boolean; path: string; icon: React.ElementType; }
interface QuickWin { label: string; description: string; icon: React.ElementType; path: string; color: string; }

export default function KundeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quickWins, setQuickWins] = useState<QuickWin[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      let customerData = null;
      if (user?.id) {
        customerData = await getUserCustomer(user.id);
        if (customerData) {
          const { count: boxCount } = await supabase.from("customer_boxes").select("id", { count: "exact", head: true }).eq("customer_id", customerData.id);
          if (!boxCount || boxCount === 0) { navigate("/kunde/setup"); return; }
          setCustomer({ id: customerData.id, name: customerData.name, email: customerData.email || user.email || "", company_name: customerData.company_name, status: customerData.status || "active", customer_number: customerData.customer_number });
        }
      }
      try { const { data: subInfo } = await supabase.functions.invoke("get-subscription-info"); if (subInfo) setSubscriptionInfo(subInfo); } catch {}
      if (customerData?.id) {
        if (customerData.id === DEMO_MERCHANT_ID) {
          setStats(DEMO_STATS);
        } else {
          await loadDashboardStats(customerData.id);
        }
        buildQuickWins(customerData);
        await buildMissions(customerData);
      } else {
        setStats({ totalContacts: 0, totalStamps: 0, totalRedemptions: 0, networkEffect: 0, newContacts7Days: 0 });
      }
    } catch (e) { console.error("Error loading data:", e); } finally { setLoading(false); }
  };

  const buildQuickWins = (cust: any) => {
    const wins: QuickWin[] = [];
    if (!cust.cover_image_url) wins.push({ label: "Titelbild hochladen", description: "Mach dein Profil für Kunden attraktiver", icon: Image, path: "/kunde/mein-geschaeft", color: "text-blue-600" });
    if (!cust.google_review_url) wins.push({ label: "Google-Bewertungsbonus aktivieren", description: "Erhalte mehr Sichtbarkeit durch Kundenbewertungen", icon: Star, path: "/kunde/marketing", color: "text-amber-600" });
    const oh = cust.opening_hours;
    if (!oh || Object.keys(oh).length === 0) wins.push({ label: "Öffnungszeiten eintragen", description: "Hilf Kunden, dich zum richtigen Zeitpunkt zu finden", icon: Clock, path: "/kunde/mein-geschaeft", color: "text-green-600" });
    wins.push({ label: "Neukunden-Kampagne starten", description: "Pushe dein Geschäft und gewinne neue Kunden", icon: Megaphone, path: "/kunde/marketing", color: "text-primary" });
    if (!cust.description) wins.push({ label: "Geschäftsbeschreibung vervollständigen", description: "Zeige Kunden, was dich besonders macht", icon: MapPin, path: "/kunde/mein-geschaeft", color: "text-rose-600" });
    setQuickWins(wins.slice(0, 4));
  };

  const buildMissions = async (cust: any) => {
    const m: Mission[] = [
      { label: "Geschäftsprofil vervollständigen", description: "Logo, Titelbild und Beschreibung hinzufügen", completed: !!(cust.logo_url && cust.cover_image_url && cust.description), path: "/kunde/mein-geschaeft", icon: Store },
      { label: "Deine fünfte Prämie erstellen", description: "Vielfalt bei den Belohnungen anbieten", completed: false, path: "/kunde/marketing", icon: Gift },
      { label: "Google-Bewertungen aktivieren", description: "Steigere deine Online-Sichtbarkeit", completed: !!cust.google_review_points_enabled, path: "/kunde/marketing?tab=reviews", icon: Star },
      { label: "Öffnungszeiten eintragen", description: "Damit Kunden wissen, wann du da bist", completed: !!(cust.opening_hours && Object.keys(cust.opening_hours).length > 0), path: "/kunde/mein-geschaeft", icon: Clock },
      { label: "Neukundenprämie hinzufügen", description: "Neue Kunden mit einem Willkommensangebot gewinnen", completed: false, path: "/kunde/marketing?tab=boost", icon: UserPlus },
    ];
    // Check rewards count (need ≥5)
    const { count: rewardCount } = await supabase.from("rewards").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cust.id).eq("is_active", true);
    m[1].completed = (rewardCount || 0) >= 5;
    // Check NCO exists
    const { count: ncoCount } = await supabase.from("new_customer_offers").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cust.id);
    m[4].completed = (ncoCount || 0) > 0;
    setMissions(m);
  };

  const loadDashboardStats = async (cid: string) => {
    try {
      const [c1, c2, c3, c4, c5] = await Promise.all([
        supabase.from("loyalty_accounts").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid),
        supabase.from("point_transactions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).eq("transaction_type", "nfc_stamp"),
        supabase.from("reward_redemptions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid),
        supabase.from("point_transactions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).eq("transaction_type", "new_customer_bonus"),
        (() => { const d = new Date(); d.setDate(d.getDate() - 7); return supabase.from("loyalty_accounts").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).gte("created_at", d.toISOString()); })()
      ]);
      const offerRed = await supabase.from("point_transactions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).eq("transaction_type", "offer_redeemed");
      setStats({ totalContacts: c1.count || 0, totalStamps: c2.count || 0, totalRedemptions: (c3.count || 0) + (offerRed.count || 0), networkEffect: c4.count || 0, newContacts7Days: c5.count || 0 });
    } catch { setStats({ totalContacts: 0, totalStamps: 0, totalRedemptions: 0, networkEffect: 0, newContacts7Days: 0 }); }
  };

  const formatDate = (ds: string) => new Date(ds).toLocaleDateString("de-DE", { year: 'numeric', month: 'long', day: 'numeric' });

  const completedMissions = missions.filter(m => m.completed).length;
  const totalMissions = missions.length;
  const progressPercent = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  const levelLabel = progressPercent >= 100 ? "Profi" : progressPercent >= 60 ? "Aktiv wachsend" : progressPercent >= 20 ? "Guter Start" : "Einsteiger";

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-8">

        {/* ====== Hero ====== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(262,60%,45%)] via-[hsl(262,70%,50%)] to-[hsl(230,70%,55%)] p-8 text-white shadow-[0_8px_30px_hsl(262,50%,40%/0.35)]">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/[0.06] rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/[0.04] rounded-full blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 opacity-70" />
              <span className="text-sm font-medium opacity-70">Dein Eloyo-Dashboard</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-[1.1]">
              Willkommen zurück{customer?.company_name ? `, ${customer.company_name}` : ''}!
            </h1>
            <p className="mt-2 text-base opacity-75 max-w-xl">
              Hier siehst du, wie dein Kundenbindungssystem läuft und wo du als Nächstes optimieren kannst.
            </p>
            {stats && (
              <div className="flex items-center gap-3 mt-5">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full px-3 py-1 backdrop-blur-sm">
                  <TrendingUp className="w-3 h-3 mr-1" /> +{stats.newContacts7Days} neue Kunden diese Woche
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {customer?.status === "paused" && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <Pause className="w-5 h-5 text-amber-600 mt-0.5" />
            <div><p className="font-semibold text-amber-900">Abo pausiert</p><p className="text-sm text-amber-700">Während der Pause bist du nicht in der Endkunden-App sichtbar.</p></div>
          </div>
        )}
        {subscriptionInfo?.cancelAtPeriodEnd && subscriptionInfo.cancelAt && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div><p className="font-semibold text-amber-900">Kündigung eingereicht</p><p className="text-sm text-amber-700">Dein Abonnement endet am {formatDate(subscriptionInfo.cancelAt)}</p></div>
          </div>
        )}

        {/* ====== KPI Cards ====== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="Kunden gesamt" value={stats?.totalContacts?.toLocaleString('de-DE') || '0'} trend={stats && stats.newContacts7Days > 0 ? `+${stats.newContacts7Days} diese Woche` : undefined} iconBg="bg-primary/10" iconColor="text-primary" />
          <KpiCard icon={Trophy} label="Stempel gesamt" value={stats?.totalStamps?.toLocaleString('de-DE') || '0'} sub="Gesamt seit Start" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <KpiCard icon={Gift} label="Prämien eingelöst" value={stats?.totalRedemptions?.toLocaleString('de-DE') || '0'} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <KpiCard icon={Zap} label="Netzwerkeffekt" value={stats?.networkEffect?.toLocaleString('de-DE') || '0'} sub="Neukundenprämien eingelöst" iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>

        {/* ====== Compact Gamification + Quick Wins side by side ====== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fortschritt */}
          {missions.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Dein Fortschritt</h2>
                    <p className="text-xs text-muted-foreground">{completedMissions}/{totalMissions} erledigt</p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full border-primary/30 text-primary text-xs px-2 py-0.5">
                  {levelLabel}
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-1.5 mb-3 bg-primary/10 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-secondary" />
              <div className="space-y-1">
                {missions.map((mission, i) => (
                  <button
                    key={i}
                    onClick={() => { if (!mission.completed) navigate(mission.path); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-200",
                      mission.completed ? "bg-emerald-50/60 cursor-default" : "hover:bg-primary/[0.04] cursor-pointer group"
                    )}
                  >
                    {mission.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-primary/60 transition-colors" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium", mission.completed ? "text-emerald-700 line-through" : "text-foreground")}>{mission.label}</p>
                    </div>
                    {!mission.completed && (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Wins */}
          {quickWins.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">Empfohlene nächste Schritte</h2>
              <p className="text-xs text-muted-foreground mb-3">Optimiere dein System für bessere Ergebnisse</p>
              <div className="space-y-2.5">
                {quickWins.map((win, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(win.path)}
                    className="w-full flex items-center gap-3 p-3.5 bg-white rounded-xl border border-border/30 hover:border-primary/30 hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.3)] transition-all duration-300 text-left group active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/[0.06] flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <win.icon className={cn("w-4 h-4", win.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{win.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{win.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
