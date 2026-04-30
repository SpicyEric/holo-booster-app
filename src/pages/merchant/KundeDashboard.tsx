import { useEffect, useState, useMemo, useCallback } from "react";
import MerchantBadges from "@/components/merchant/MerchantBadges";
import { BADGE_DEFS } from "@/components/merchant/MerchantBadges";
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
  Store, UserPlus, MessageSquare, Cake, Rocket, Bell, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import CountUp from "@/components/CountUp";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";

interface Customer { id: string; name: string; email: string; company_name: string | null; status: string; customer_number: number | null; created_at?: string; postal_code?: string | null; birthday_enabled?: boolean; referral_inviter_points?: number | null; }
interface SubscriptionInfo { hasSubscription: boolean; status?: string; currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean; cancelAt?: string | null; }
interface NfcCardInfo { color: string; points: number; }
interface DashboardStats {
  totalContacts: number;
  totalPointsAwarded: number;
  totalRedemptions: number;
  invitedCustomers: number;
  newContactsThisWeek: number;
  birthdayMessagesSent: number;
  winbackMessagesSent: number;
  topRewardTitle: string | null;
  topRewardCount: number;
  nfcCards: NfcCardInfo[];
  referralBonusPoints: number;
}

const DEMO_MERCHANT_ID = "e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45";
const DEMO_STATS: DashboardStats = {
  totalContacts: 832, totalPointsAwarded: 12480, totalRedemptions: 312, invitedCustomers: 87, newContactsThisWeek: 117,
  birthdayMessagesSent: 24, winbackMessagesSent: 41, topRewardTitle: "Gratis Kaffee", topRewardCount: 142,
  nfcCards: [{ color: "grün", points: 1 }, { color: "blau", points: 2 }, { color: "rot", points: 3 }],
  referralBonusPoints: 20,
};

const KpiCard = ({ icon: Icon, label, value, countTo, sub, trend, iconBg, iconColor, bigNumber }: { icon: React.ElementType; label: string; value?: string; countTo?: number | null; sub?: string; trend?: string; iconBg: string; iconColor: string; bigNumber?: boolean }) => (
  <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.4)] transition-all duration-300 group">
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105", iconBg)}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>
      )}
    </div>
    <p className={cn("font-bold text-foreground tracking-tight", bigNumber ? "text-5xl" : "text-3xl")}>
      {typeof countTo === 'number' ? (
        <CountUp to={countTo} separator="." duration={2.2} />
      ) : (
        value ?? '–'
      )}
    </p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
    {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
  </div>
);

interface Mission {
  label: string;
  description: string;
  tooltip: string;
  completed: boolean;
  path: string;
  icon: React.ElementType;
}

interface QuickWin { label: string; description: string; icon: React.ElementType; path: string; color: string; }

interface NotificationItem {
  id: string;
  icon: React.ElementType;
  text: string;
  time: string;
  color: string;
  imageUrl?: string;
}

// Exploration tips shown when all missions are done
const EXPLORATION_TIPS: QuickWin[] = [
  { label: "Nachrichtensystem entdecken", description: "Sende personalisierte Nachrichten an deine Kunden direkt über die App", icon: MessageSquare, path: "/kunde/marketing?tab=nachrichten", color: "text-blue-600" },
  { label: "Geburtstagsnachrichten einrichten", description: "Überrasche Kunden automatisch zum Geburtstag mit einem Bonus", icon: Cake, path: "/kunde/marketing?tab=automationen", color: "text-pink-600" },
  { label: "Boost-System nutzen", description: "Zeige deine Neukundenaktion ganz oben im App-Feed", icon: Rocket, path: "/kunde/marketing?tab=boost", color: "text-amber-600" },
  { label: "Marketing-Kampagne starten", description: "Erreiche bestehende Kunden mit gezielten SMS-Kampagnen", icon: Megaphone, path: "/kunde/marketing?tab=kampagnen", color: "text-primary" },
  { label: "Geschäftsprofil optimieren", description: "Aktualisiere dein Profil für eine bessere Sichtbarkeit in der App", icon: Store, path: "/kunde/mein-geschaeft", color: "text-emerald-600" },
];

/** Get the most recent Monday at 00:00:00 local time */
function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function KundeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [allMissionsDoneOver24h, setAllMissionsDoneOver24h] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) loadData(); }, [user]);

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => new Set(prev).add(id));
  };

  const visibleNotifications = notifications.filter(n => !dismissedNotifications.has(n.id));

  const loadData = async () => {
    try {
      setLoading(true);
      let customerData = null;
      if (user?.id) {
        customerData = await getUserCustomer(user.id);
        if (customerData) {
          // Wizard deaktiviert: Händler werden direkt ins Dashboard gelassen,
          // Box-ID und Karten-System werden vom Vertriebler/Admin oder
          // im Bereich "Mein Geschäft" gepflegt.
          setCustomer({ id: customerData.id, name: customerData.name, email: customerData.email || user.email || "", company_name: customerData.company_name, status: customerData.status || "active", customer_number: customerData.customer_number, created_at: customerData.created_at, postal_code: customerData.postal_code, birthday_enabled: customerData.birthday_enabled, referral_inviter_points: (customerData as any).referral_inviter_points });
        }
      }
      try { const { data: subInfo } = await supabase.functions.invoke("get-subscription-info"); if (subInfo) setSubscriptionInfo(subInfo); } catch {}
      if (customerData?.id) {
        if (customerData.id === DEMO_MERCHANT_ID) {
          setStats(DEMO_STATS);
          setNotifications([
            { id: "demo-stamps-24h", icon: Trophy, text: "50 neue Karte in den letzten 24 Stunden", time: "Heute", color: "text-emerald-600" },
            { id: "demo-customers-7d", icon: UserPlus, text: "117 neue Kunden diese Woche", time: "Diese Woche", color: "text-primary" },
          ]);
          setAllMissionsDoneOver24h(true);
        } else {
          await loadDashboardStats(customerData.id, (customerData as any).referral_inviter_points ?? 20);
        }
        await buildMissions(customerData);
      } else {
        setStats({ totalContacts: 0, totalPointsAwarded: 0, totalRedemptions: 0, invitedCustomers: 0, newContactsThisWeek: 0, birthdayMessagesSent: 0, winbackMessagesSent: 0, topRewardTitle: null, topRewardCount: 0, nfcCards: [], referralBonusPoints: 20 });
      }
    } catch (e) { console.error("Error loading data:", e); } finally { setLoading(false); }
  };

  const buildMissions = async (cust: any) => {
    const m: Mission[] = [
      {
        label: "Geschäftsprofil vervollständigen",
        description: "Logo, Titelbild und Beschreibung hinzufügen",
        tooltip: "Füge ein Logo, ein Titelbild und eine Beschreibung hinzu, damit dein Geschäft in der App professionell und einladend wirkt.",
        completed: !!(cust.logo_url && cust.cover_image_url && cust.description),
        path: "/kunde/mein-geschaeft",
        icon: Store,
      },
      {
        label: "Deine fünfte Prämie erstellen",
        description: "Vielfalt bei den Belohnungen anbieten",
        tooltip: "Wir empfehlen mindestens 5 Prämien, damit deine Kunden eine attraktive Auswahl haben und ihre Punkte spielerisch einsetzen können.",
        completed: false,
        path: "/kunde/marketing",
        icon: Gift,
      },
      {
        label: "Google-Bewertungen aktivieren",
        description: "Steigere deine Online-Sichtbarkeit",
        tooltip: "Aktiviere den Bewertungsbonus, um Kunden für Google-Bewertungen zu belohnen und so mehr Sichtbarkeit und Vertrauen online aufzubauen.",
        completed: !!cust.google_review_points_enabled,
        path: "/kunde/marketing?tab=reviews",
        icon: Star,
      },
      {
        label: "Öffnungszeiten eintragen",
        description: "Damit Kunden wissen, wann du da bist",
        tooltip: "Trage deine Öffnungszeiten ein, damit Kunden in der App sofort sehen können, wann sie dich besuchen können.",
        completed: !!(cust.opening_hours && Object.keys(cust.opening_hours).length > 0),
        path: "/kunde/mein-geschaeft",
        icon: Clock,
      },
      {
        label: "Neukundenprämie hinzufügen",
        description: "Neue Kunden mit einem Willkommensangebot gewinnen",
        tooltip: "Erstelle eine Neukundenprämie, die nur Nutzern angezeigt wird, die noch keine Punkte bei dir gesammelt haben – perfekt, um neue Kunden ins Geschäft zu holen.",
        completed: false,
        path: "/kunde/marketing?tab=boost",
        icon: UserPlus,
      },
    ];
    const { count: rewardCount } = await supabase.from("rewards").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cust.id).eq("is_active", true);
    m[1].completed = (rewardCount || 0) >= 5;
    const { count: ncoCount } = await supabase.from("new_customer_offers").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cust.id);
    m[4].completed = (ncoCount || 0) > 0;
    setMissions(m);

    // Track when all missions were first completed
    const allDone = m.every(mi => mi.completed);
    const storageKey = `eloyo_missions_done_${cust.id}`;
    if (allDone) {
      const savedTs = localStorage.getItem(storageKey);
      if (!savedTs) {
        localStorage.setItem(storageKey, new Date().toISOString());
      } else {
        const elapsed = Date.now() - new Date(savedTs).getTime();
        if (elapsed >= 24 * 60 * 60 * 1000) {
          setAllMissionsDoneOver24h(true);
          await loadNotifications(cust.id);
        }
      }
    } else {
      // Reset if missions are no longer all done
      localStorage.removeItem(storageKey);
      setAllMissionsDoneOver24h(false);
    }
  };

  const loadNotifications = async (customerId: string) => {
    try {
      const now = new Date();
      const items: NotificationItem[] = [];

      // Load last earned badge as default notification
      const { data: badgeData } = await supabase
        .from("merchant_badges" as any)
        .select("badge_key, earned_at")
        .eq("customer_id", customerId)
        .order("earned_at", { ascending: false })
        .limit(1);

      if (badgeData && (badgeData as any[]).length > 0) {
        const lastBadge = (badgeData as any[])[0];
        const badgeDef = BADGE_DEFS.find(b => b.key === lastBadge.badge_key);
        if (badgeDef) {
          const earnedDate = new Date(lastBadge.earned_at);
          const daysAgo = Math.floor((now.getTime() - earnedDate.getTime()) / (1000 * 60 * 60 * 24));
          const timeLabel = daysAgo === 0 ? "Heute" : daysAgo === 1 ? "Gestern" : `Vor ${daysAgo} Tagen`;
          items.push({
            id: `badge-${lastBadge.badge_key}`,
            icon: Trophy,
            text: `Erfolg abgeschlossen: ${badgeDef.label}`,
            time: timeLabel,
            color: "text-amber-600",
            imageUrl: badgeDef.icon,
          });
        }
      }

      // Recent stamps (last 24h)
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentStamps } = await supabase
        .from("point_transactions")
        .select("id", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .eq("transaction_type", "nfc_stamp")
        .gte("created_at", yesterday);
      if (recentStamps && recentStamps > 0) {
        items.push({ id: "stamps-24h", icon: Trophy, text: `${recentStamps} neue Karte in den letzten 24 Stunden`, time: "Heute", color: "text-emerald-600" });
      }

      // Recent new customers (last 7 days)
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: newCustomers } = await supabase
        .from("loyalty_accounts")
        .select("id", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .gte("created_at", weekAgo);
      if (newCustomers && newCustomers > 0) {
        items.push({ id: "new-customers-7d", icon: UserPlus, text: `${newCustomers} neue Kunden diese Woche`, time: "Diese Woche", color: "text-primary" });
      }

      // Recent redemptions (last 7 days)
      const { count: recentRedemptions } = await supabase
        .from("point_transactions")
        .select("id", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .in("transaction_type", ["reward_redeemed", "offer_redeemed"])
        .gte("created_at", weekAgo);
      if (recentRedemptions && recentRedemptions > 0) {
        items.push({ id: "redemptions-7d", icon: Gift, text: `${recentRedemptions} Prämien eingelöst diese Woche`, time: "Diese Woche", color: "text-amber-600" });
      }

      setNotifications(items);
    } catch (e) {
      console.error("Error loading notifications:", e);
    }
  };

  const loadDashboardStats = async (cid: string, referralBonusPoints: number) => {
    try {
      const mondayIso = getMondayOfCurrentWeek().toISOString();
      const [
        contactsRes,
        pointsRes,
        rewardRedRes,
        offerRedRes,
        newContactsRes,
        nfcChipsRes,
        invitedRes,
        birthdayRes,
        winbackRes,
        rewardsRes,
        topRewardRedRes,
      ] = await Promise.all([
        supabase.from("loyalty_accounts").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid),
        supabase.from("point_transactions").select("points_change").eq("merchant_customer_id", cid).eq("transaction_type", "nfc_stamp"),
        supabase.from("reward_redemptions").select("reward_id").eq("merchant_customer_id", cid),
        supabase.from("point_transactions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).eq("transaction_type", "offer_redeemed"),
        supabase.from("loyalty_accounts").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).gte("created_at", mondayIso),
        supabase.from("nfc_chips").select("stamp_color, points_value").eq("merchant_customer_id", cid),
        supabase.from("invitation_redemptions").select("invitation_id, invitations!inner(merchant_customer_id)").eq("invitations.merchant_customer_id", cid).not("invitee_stamped_at", "is", null),
        supabase.from("app_messages").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).ilike("title", "%geburtstag%"),
        supabase.from("app_messages").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).or("title.ilike.%rückhol%,title.ilike.%vermiss%,title.ilike.%winback%"),
        supabase.from("rewards").select("id, title").eq("merchant_customer_id", cid),
        supabase.from("reward_redemptions").select("reward_id").eq("merchant_customer_id", cid),
      ]);

      // Sum vergebene Punkte
      const totalPointsAwarded = (pointsRes.data || []).reduce((sum: number, r: any) => sum + (r.points_change || 0), 0);

      // NFC cards aggregated by color (unique color → highest/first points value)
      const cardMap = new Map<string, number>();
      (nfcChipsRes.data || []).forEach((c: any) => {
        if (c.stamp_color && !cardMap.has(c.stamp_color)) {
          cardMap.set(c.stamp_color, c.points_value || 0);
        }
      });
      const colorOrder = ["grün", "gruen", "green", "blau", "blue", "gelb", "yellow", "orange", "rot", "red", "lila", "purple"];
      const nfcCards: NfcCardInfo[] = Array.from(cardMap.entries())
        .sort(([a], [b]) => {
          const ai = colorOrder.indexOf(a.toLowerCase()); const bi = colorOrder.indexOf(b.toLowerCase());
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
        .map(([color, points]) => ({ color, points }));

      // Top reward
      const rewardCounts = new Map<string, number>();
      (topRewardRedRes.data || []).forEach((r: any) => {
        if (r.reward_id) rewardCounts.set(r.reward_id, (rewardCounts.get(r.reward_id) || 0) + 1);
      });
      let topRewardId: string | null = null; let topRewardCount = 0;
      rewardCounts.forEach((cnt, id) => { if (cnt > topRewardCount) { topRewardCount = cnt; topRewardId = id; } });
      const topRewardTitle = topRewardId ? ((rewardsRes.data || []).find((r: any) => r.id === topRewardId)?.title ?? null) : null;

      setStats({
        totalContacts: contactsRes.count || 0,
        totalPointsAwarded,
        totalRedemptions: ((rewardRedRes.data || []).length) + (offerRedRes.count || 0),
        invitedCustomers: (invitedRes.data || []).length,
        newContactsThisWeek: newContactsRes.count || 0,
        birthdayMessagesSent: birthdayRes.count || 0,
        winbackMessagesSent: winbackRes.count || 0,
        topRewardTitle,
        topRewardCount,
        nfcCards,
        referralBonusPoints,
      });
    } catch {
      setStats({ totalContacts: 0, totalPointsAwarded: 0, totalRedemptions: 0, invitedCustomers: 0, newContactsThisWeek: 0, birthdayMessagesSent: 0, winbackMessagesSent: 0, topRewardTitle: null, topRewardCount: 0, nfcCards: [], referralBonusPoints });
    }
  };

  const formatDate = (ds: string) => new Date(ds).toLocaleDateString("de-DE", { year: 'numeric', month: 'long', day: 'numeric' });

  const completedMissions = missions.filter(m => m.completed).length;
  const totalMissions = missions.length;
  const progressPercent = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  const levelLabel = progressPercent >= 100 ? "Profi" : progressPercent >= 60 ? "Aktiv wachsend" : progressPercent >= 20 ? "Guter Start" : "Einsteiger";

  // Quick wins: show incomplete missions, or random exploration tips if all done
  const quickWins = useMemo(() => {
    const incomplete = missions.filter(m => !m.completed);
    if (incomplete.length > 0) {
      return incomplete.slice(0, 2).map(m => ({
        label: m.label,
        description: m.tooltip,
        icon: m.icon,
        path: m.path,
        color: "text-primary",
      }));
    }
    const shuffled = [...EXPLORATION_TIPS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, [missions]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-8">

          {/* ====== Hero ====== */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(262,60%,45%)] via-[hsl(262,70%,50%)] to-[hsl(230,70%,55%)] p-8 text-white shadow-[0_8px_30px_hsl(262,50%,40%/0.35)]">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/[0.06] rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/[0.04] rounded-full blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
            <div className="relative z-10 flex items-end justify-between gap-6">
              <div className="flex-1 min-w-0">
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
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {stats.newContactsThisWeek > 0
                        ? `+${stats.newContactsThisWeek} neue Kunden diese Woche`
                        : "Du baust gerade deinen Stammkundenring auf"}
                    </Badge>
                  </div>
                )}
              </div>
              {customer && (
                <div className="shrink-0">
                  <MerchantBadges
                    customerId={customer.id}
                    customerCreatedAt={customer.created_at}
                    postalCode={customer.postal_code}
                    birthdayEnabled={customer.birthday_enabled}
                  />
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
            <KpiCard icon={Users} label="Kunden gesamt" countTo={stats?.totalContacts ?? 0} trend={stats && stats.newContactsThisWeek > 0 ? `+${stats.newContactsThisWeek} diese Woche` : undefined} iconBg="bg-primary/10" iconColor="text-primary" bigNumber />
            <KpiCard icon={Trophy} label="Vergebene Punkte" countTo={stats?.totalPointsAwarded ?? 0} sub="Gesamt seit Start" iconBg="bg-emerald-50" iconColor="text-emerald-600" bigNumber />
            <KpiCard icon={Gift} label="Prämien eingelöst" countTo={stats?.totalRedemptions ?? 0} iconBg="bg-amber-50" iconColor="text-amber-600" />
            <KpiCard
              icon={Zap}
              label="Eingeladene Kunden"
              countTo={stats && stats.invitedCustomers > 0 ? stats.invitedCustomers : null}
              value={stats && stats.invitedCustomers > 0 ? undefined : '–'}
              sub={stats && stats.invitedCustomers > 0 ? "Erfolgreich angenommen" : "Noch keine Einladungen"}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
          </div>

          {/* ====== NFC-Karten & Empfehlungsbonus ====== */}
          {stats && (stats.nfcCards.length > 0 || stats.referralBonusPoints > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* NFC-Karten Fächer */}
              <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Deine NFC-Karten</h2>
                    <p className="text-xs text-muted-foreground">Aktuelle Punktevergabe pro Karte</p>
                  </div>
                </div>
                <div className="flex items-end justify-center h-44 pt-4">
                  {stats.nfcCards.length === 0 ? (
                    <p className="text-xs text-muted-foreground self-center">Noch keine Karten registriert.</p>
                  ) : (
                    <div className="relative" style={{ width: `${Math.max(stats.nfcCards.length * 60 + 80, 220)}px`, height: '160px' }}>
                      {stats.nfcCards.map((card, i) => {
                        const total = stats.nfcCards.length;
                        const middle = (total - 1) / 2;
                        const offset = i - middle;
                        const rotation = offset * 12;
                        const xShift = offset * 50;
                        const yShift = Math.abs(offset) * 8;
                        const colorMap: Record<string, string> = {
                          'grün': 'bg-gradient-to-br from-emerald-400 to-emerald-600',
                          'gruen': 'bg-gradient-to-br from-emerald-400 to-emerald-600',
                          'green': 'bg-gradient-to-br from-emerald-400 to-emerald-600',
                          'blau': 'bg-gradient-to-br from-sky-400 to-blue-600',
                          'blue': 'bg-gradient-to-br from-sky-400 to-blue-600',
                          'rot': 'bg-gradient-to-br from-rose-400 to-red-600',
                          'red': 'bg-gradient-to-br from-rose-400 to-red-600',
                          'gelb': 'bg-gradient-to-br from-yellow-300 to-amber-500',
                          'yellow': 'bg-gradient-to-br from-yellow-300 to-amber-500',
                          'lila': 'bg-gradient-to-br from-purple-400 to-violet-600',
                          'purple': 'bg-gradient-to-br from-purple-400 to-violet-600',
                          'orange': 'bg-gradient-to-br from-orange-400 to-orange-600',
                        };
                        const cardClass = colorMap[card.color.toLowerCase()] || 'bg-gradient-to-br from-slate-400 to-slate-600';
                        return (
                          <div
                            key={card.color}
                            className={cn("absolute left-1/2 top-2 w-24 h-36 rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.18)] flex flex-col justify-between p-2.5 text-white", cardClass)}
                            style={{
                              transform: `translateX(calc(-50% + ${xShift}px)) translateY(${yShift}px) rotate(${rotation}deg)`,
                              zIndex: 10 + i,
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 capitalize">{card.color}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold leading-none">{card.points}</p>
                              <p className="text-[9px] opacity-80 mt-0.5">{card.points === 1 ? 'Punkt' : 'Punkte'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/70 text-center mt-2">
                  Konfigurierbar in „Mein Geschäft"
                </p>
              </div>

              {/* Empfehlungsbonus + Automationen */}
              <div className="space-y-4">
                <button
                  onClick={() => navigate('/kunde/marketing?tab=referral')}
                  className="w-full bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.4)] hover:border-primary/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Weiterempfehlungs-Bonus</p>
                        <p className="text-xs text-muted-foreground">Pro erfolgreicher Empfehlung deines Geschäfts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">{stats.referralBonusPoints}</span>
                      <span className="text-xs text-muted-foreground">{stats.referralBonusPoints === 1 ? 'Punkt' : 'Punkte'}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate('/kunde/marketing?tab=automations')}
                    className="bg-white rounded-2xl p-4 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.4)] hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                        <Cake className="w-4 h-4 text-pink-600" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      <CountUp to={stats.birthdayMessagesSent} duration={1.5} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Geburtstagsgrüße</p>
                  </button>
                  <button
                    onClick={() => navigate('/kunde/marketing?tab=automations')}
                    className="bg-white rounded-2xl p-4 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.4)] hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      <CountUp to={stats.winbackMessagesSent} duration={1.5} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Rückholnachrichten</p>
                  </button>
                </div>

                {/* Top-Prämie */}
                <div className="bg-white rounded-2xl p-4 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Deine Top-Prämie</p>
                      {stats.topRewardTitle ? (
                        <>
                          <p className="text-sm font-semibold text-foreground truncate">{stats.topRewardTitle}</p>
                          <p className="text-xs text-muted-foreground">{stats.topRewardCount}× eingelöst</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">Noch keine Prämie eingelöst</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====== Compact Gamification + Quick Wins side by side ====== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fortschritt OR Benachrichtigungen */}
            {allMissionsDoneOver24h ? (
              <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Benachrichtigungen</h2>
                    <p className="text-xs text-muted-foreground">Aktuelle Aktivitäten deines Geschäfts</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {visibleNotifications.length === 0 ? (
                    <div className="flex items-center gap-3 px-3 py-4 rounded-lg bg-muted/30 border border-border/20">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Alles ruhig hier.</p>
                    </div>
                  ) : (
                    visibleNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/20"
                      >
                        {notif.imageUrl ? (
                          <img src={notif.imageUrl} alt="" className="w-8 h-8 rounded-lg shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/[0.06] flex items-center justify-center shrink-0">
                            <notif.icon className={cn("w-4 h-4", notif.color)} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{notif.text}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 mr-1">{notif.time}</span>
                        <button
                          onClick={() => dismissNotification(notif.id)}
                          className="shrink-0 p-0.5 rounded hover:bg-muted/60 transition-colors"
                          aria-label="Entfernen"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : missions.length > 0 && (
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
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(mission.path)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-200",
                            mission.completed ? "bg-emerald-50/60 cursor-pointer" : "hover:bg-primary/[0.04] cursor-pointer group"
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
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[260px] text-xs leading-relaxed">
                        {mission.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Wins / Empfohlene nächste Schritte */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">Empfohlene nächste Schritte</h2>
              <p className="text-xs text-muted-foreground mb-3">
                {missions.every(m => m.completed) ? "Entdecke weitere Features deines Systems" : "Optimiere dein System für bessere Ergebnisse"}
              </p>
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
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}
