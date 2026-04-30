import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { 
  Loader2, TrendingUp, Gift, Search, Filter, CalendarDays, 
  ChevronDown, ChevronUp, Star, Activity, Clock, Users, Nfc, Sparkles, ScanLine
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

interface Transaction {
  id: string;
  created_at: string;
  points_change: number;
  transaction_type: string | null;
  description: string | null;
}

interface Reward { id: string; title: string; }
interface NfcCard { id: string; name: string | null; points: number; color: string | null; }
interface HourlyData { hour: string; count: number; }
interface GrowthData { date: string; total: number; }
interface GenderData { gender: string; count: number; percentage: number; }
interface AgeData { age: string; count: number; male: number; female: number; }
interface CustomerSegment { name: string; label: string; count: number; percentage: number; color: string; }

type ViewMode = "total" | "range";
type QuickRange = 7 | 14 | 30 | 90 | null;

const DEMO_MERCHANT_ID = "e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45";

export default function Transaktionen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [nfcCards, setNfcCards] = useState<NfcCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // all | stamps | redemptions | bonus
  const [subFilter, setSubFilter] = useState<string>("all"); // depends on typeFilter
  const [showAll, setShowAll] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [allLoyaltyAccounts, setAllLoyaltyAccounts] = useState<{ created_at: string }[]>([]);

  // Global view mode
  const [viewMode, setViewMode] = useState<ViewMode>("range");
  const [quickRange, setQuickRange] = useState<QuickRange>(30);
  const initialFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();
  const initialTo = (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();
  const [dateFrom, setDateFrom] = useState<Date>(initialFrom);
  const [dateTo, setDateTo] = useState<Date>(initialTo);

  // Analytics state (computed locally from filtered data)
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);

  const INITIAL_COUNT = 20;

  useEffect(() => { if (user) loadData(); }, [user]);

  // Reset subFilter when typeFilter changes
  useEffect(() => { setSubFilter("all"); }, [typeFilter]);

  // When switching mode/quickRange, sync dates
  useEffect(() => {
    if (viewMode === "range" && quickRange) {
      const to = new Date(); to.setHours(23,59,59,999);
      const from = new Date(); from.setDate(from.getDate() - quickRange); from.setHours(0,0,0,0);
      setDateFrom(from); setDateTo(to);
    }
  }, [quickRange, viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const customer = await getUserCustomer(user!.id);
      if (!customer) return;
      setCustomerId(customer.id);

      const isDemo = customer.id === DEMO_MERCHANT_ID;

      const [txResult, rewardResult, cardResult, accountsResult] = await Promise.all([
        supabase.from("point_transactions").select("id, created_at, points_change, transaction_type, description").eq("merchant_customer_id", customer.id).order("created_at", { ascending: false }).limit(1000),
        supabase.from("rewards").select("id, title").eq("merchant_customer_id", customer.id).eq("is_active", true),
        supabase.from("nfc_cards" as any).select("id, name, points, color").eq("merchant_customer_id", customer.id).then((r: any) => r).catch(() => ({ data: [] as any[] })),
        supabase.from("loyalty_accounts").select("created_at").eq("merchant_customer_id", customer.id).order("created_at", { ascending: true }),
      ]);

      setTransactions(txResult.data || []);
      setRewards(rewardResult.data || []);
      setNfcCards(((cardResult as any)?.data as any[]) || []);
      setAllLoyaltyAccounts((accountsResult.data as any[]) || []);

      if (isDemo) {
        const demoTx: Transaction[] = [];
        const txTypes = ['nfc_stamp', 'nfc_stamp', 'nfc_stamp', 'nfc_stamp', 'nfc_stamp', 'reward_redeemed', 'offer_redeemed', 'google_review', 'birthday_bonus', 'welcome_bonus', 'referral_bonus', 'double_points'];
        const stampDescs = ['Punkte gesammelt', 'Punkte erhalten', 'NFC-Karte'];
        const rewardDescs = ['Gratis Kaffee eingelöst', 'Rabatt 10% eingelöst', 'Gratis Brötchen eingelöst', 'Kuchen-Gutschein eingelöst', 'Frühstücks-Deal eingelöst'];
        const now = new Date();
        for (let i = 0; i < 400; i++) {
          const ago = Math.floor(Math.random() * 90 * 24 * 60) * 60000;
          const d = new Date(now.getTime() - ago);
          const h = 6 + Math.floor(Math.random() * 16);
          d.setHours(h, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
          const type = txTypes[Math.floor(Math.random() * txTypes.length)];
          const isRedemption = type === 'reward_redeemed' || type === 'offer_redeemed';
          let pts: number;
          if (isRedemption) pts = -(Math.floor(Math.random() * 5 + 1) * 50);
          else if (type === 'nfc_stamp') {
            const cardPts = [5, 10, 15];
            pts = cardPts[Math.floor(Math.random() * cardPts.length)];
          } else pts = Math.floor(Math.random() * 3 + 1) * 10;
          const desc = isRedemption ? rewardDescs[Math.floor(Math.random() * rewardDescs.length)]
            : type === 'google_review' ? 'Google Bewertung Bonus'
            : type === 'birthday_bonus' ? 'Geburtstagsbonus'
            : type === 'welcome_bonus' ? 'Willkommensbonus'
            : type === 'referral_bonus' ? 'Einladungsbonus'
            : type === 'double_points' ? 'Doppelte Punkte'
            : stampDescs[Math.floor(Math.random() * stampDescs.length)];
          demoTx.push({ id: `demo-${i}`, created_at: d.toISOString(), points_change: pts, transaction_type: type, description: desc });
        }
        demoTx.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTransactions(demoTx);

        // Demo NFC cards
        setNfcCards([
          { id: 'demo-c1', name: 'Grüne Karte', points: 5, color: 'grün' },
          { id: 'demo-c2', name: 'Blaue Karte', points: 10, color: 'blau' },
          { id: 'demo-c3', name: 'Rote Karte', points: 15, color: 'rot' },
        ]);

        // Demo loyalty accounts (spread over last 90 days)
        const demoAccs: { created_at: string }[] = [];
        for (let i = 0; i < 832; i++) {
          const ago = Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000;
          demoAccs.push({ created_at: new Date(now.getTime() - ago).toISOString() });
        }
        demoAccs.sort((a,b) => a.created_at.localeCompare(b.created_at));
        setAllLoyaltyAccounts(demoAccs);

        setGenderData([{ gender: "Männlich", count: 408, percentage: 49 },{ gender: "Weiblich", count: 424, percentage: 51 }]);
        setAgeData([{age:"14-17",count:42,male:20,female:22},{age:"18-24",count:125,male:60,female:65},{age:"25-34",count:216,male:106,female:110},{age:"35-44",count:192,male:95,female:97},{age:"45-54",count:141,male:70,female:71},{age:"55-64",count:75,male:37,female:38},{age:"65+",count:41,male:20,female:21}]);
        setSegments([
          { name: "Neu", label: "1 Besuch", count: 183, percentage: 22, color: "#22C55E" },
          { name: "Kunden", label: "2-5 Besuche", count: 258, percentage: 31, color: "#A855F7" },
          { name: "Stammkunden", label: "6-15 Besuche", count: 266, percentage: 32, color: "#3B82F6" },
          { name: "VIP-Stammkunden", label: "15+ Besuche", count: 125, percentage: 15, color: "#F97316" }
        ]);
      } else {
        await Promise.all([
          loadGenderData(customer.id),
          loadAgeData(customer.id),
          loadCustomerSegments(customer.id),
        ]);
      }
    } catch (err) { console.error("Error loading transactions:", err); } finally { setLoading(false); }
  };

  const loadGenderData = async (cid: string) => {
    const { data: la } = await supabase.from("loyalty_accounts").select("user_id").eq("merchant_customer_id", cid);
    if (!la || la.length === 0) { setGenderData([{ gender: "Männlich", count: 0, percentage: 0 }, { gender: "Weiblich", count: 0, percentage: 0 }]); return; }
    const { data: profiles } = await supabase.from("profiles").select("gender").in("user_id", la.map(a => a.user_id));
    let m = 0, f = 0; (profiles || []).forEach((p: any) => { if (p.gender === "männlich" || p.gender === "male") m++; else if (p.gender === "weiblich" || p.gender === "female") f++; });
    const t = m + f; setGenderData([{ gender: "Männlich", count: m, percentage: t > 0 ? Math.round(m / t * 100) : 0 }, { gender: "Weiblich", count: f, percentage: t > 0 ? Math.round(f / t * 100) : 0 }]);
  };

  const loadAgeData = async (cid: string) => {
    const { data: la } = await supabase.from("loyalty_accounts").select("user_id").eq("merchant_customer_id", cid);
    const brackets = [{ label: "14-17", min: 14, max: 17 }, { label: "18-24", min: 18, max: 24 }, { label: "25-34", min: 25, max: 34 }, { label: "35-44", min: 35, max: 44 }, { label: "45-54", min: 45, max: 54 }, { label: "55-64", min: 55, max: 64 }, { label: "65+", min: 65, max: 150 }];
    const mc: Record<string, number> = {}; const fc: Record<string, number> = {}; const ac: Record<string, number> = {};
    brackets.forEach(b => { mc[b.label] = 0; fc[b.label] = 0; ac[b.label] = 0; });
    if (la && la.length > 0) {
      const { data: ps } = await supabase.from("profiles").select("birth_date, gender").in("user_id", la.map(a => a.user_id));
      (ps || []).forEach((p: any) => {
        if (p.birth_date) {
          const age = Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          const br = brackets.find(b => age >= b.min && age <= b.max);
          if (br) {
            ac[br.label]++;
            if (p.gender === 'männlich' || p.gender === 'male') mc[br.label]++;
            else if (p.gender === 'weiblich' || p.gender === 'female') fc[br.label]++;
          }
        }
      });
    }
    setAgeData(brackets.map(b => ({ age: b.label, count: ac[b.label] || 0, male: mc[b.label] || 0, female: fc[b.label] || 0 })));
  };

  const loadCustomerSegments = async (cid: string) => {
    const { data: la } = await supabase.from("loyalty_accounts").select("id, user_id").eq("merchant_customer_id", cid);
    if (!la || la.length === 0) { setSegments([{ name: "Neu", label: "1 Besuch", count: 0, percentage: 0, color: "#22C55E" }, { name: "Kunden", label: "2-5 Besuche", count: 0, percentage: 0, color: "#A855F7" }, { name: "Stammkunden", label: "6-15 Besuche", count: 0, percentage: 0, color: "#3B82F6" }, { name: "VIP-Stammkunden", label: "15+ Besuche", count: 0, percentage: 0, color: "#F97316" }]); return; }
    const utc: Record<string, number> = {};
    for (const acc of la) { const { count } = await supabase.from("point_transactions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).eq("loyalty_account_id", acc.id).eq("transaction_type", "nfc_stamp"); utc[acc.id] = count || 0; }
    let n = 0, s = 0, t2 = 0, v = 0; Object.values(utc).forEach(c => { if (c <= 1) n++; else if (c <= 5) s++; else if (c <= 15) t2++; else v++; });
    const tot = la.length;
    setSegments([{ name: "Neu", label: "1 Besuch", count: n, percentage: tot > 0 ? Math.round(n / tot * 100) : 0, color: "#22C55E" }, { name: "Kunden", label: "2-5 Besuche", count: s, percentage: tot > 0 ? Math.round(s / tot * 100) : 0, color: "#A855F7" }, { name: "Stammkunden", label: "6-15 Besuche", count: t2, percentage: tot > 0 ? Math.round(t2 / tot * 100) : 0, color: "#3B82F6" }, { name: "VIP-Stammkunden", label: "15+ Besuche", count: v, percentage: tot > 0 ? Math.round(v / tot * 100) : 0, color: "#F97316" }]);
  };

  // Helper: classify transaction
  const isStamp = (tx: Transaction) => tx.transaction_type === 'nfc_stamp';
  const isRedemption = (tx: Transaction) => tx.transaction_type === 'reward_redeemed' || tx.transaction_type === 'offer_redeemed' || (tx.points_change < 0);
  const isBonus = (tx: Transaction) => !isStamp(tx) && !isRedemption(tx) && tx.points_change > 0;

  // Bonus sub-types
  const getBonusKind = (tx: Transaction): string => {
    const t = tx.transaction_type || '';
    if (t === 'referral_bonus' || (tx.description || '').toLowerCase().includes('einladung') || (tx.description || '').toLowerCase().includes('empfehl')) return 'referral';
    if (t === 'double_points' || (tx.description || '').toLowerCase().includes('doppelt')) return 'double';
    if (t === 'welcome_bonus' || (tx.description || '').toLowerCase().includes('willkomm')) return 'welcome';
    if (t === 'birthday_bonus' || (tx.description || '').toLowerCase().includes('geburts')) return 'birthday';
    if (t === 'google_review' || (tx.description || '').toLowerCase().includes('bewert')) return 'review';
    return 'other';
  };
  const bonusKindLabel: Record<string, string> = {
    referral: 'Einladungsbonus',
    double: 'Doppelte Punkte',
    welcome: 'Willkommensbonus',
    birthday: 'Geburtstagsbonus',
    review: 'Bewertungsbonus',
    other: 'Sonstige Boni',
  };

  // Window-filtered transactions (by viewMode)
  const windowTx = useMemo(() => {
    if (viewMode === "total") return transactions;
    return transactions.filter(tx => {
      const d = new Date(tx.created_at);
      return d >= dateFrom && d <= dateTo;
    });
  }, [transactions, viewMode, dateFrom, dateTo]);

  // Final filtered (search + type + sub)
  const filtered = useMemo(() => {
    return windowTx.filter(tx => {
      if (search) {
        const text = (tx.description || tx.transaction_type || "").toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }
      if (typeFilter === "stamps") {
        if (!isStamp(tx)) return false;
        if (subFilter !== "all") {
          const card = nfcCards.find(c => c.id === subFilter);
          if (card && tx.points_change !== card.points) return false;
        }
      } else if (typeFilter === "redemptions") {
        if (!isRedemption(tx)) return false;
        if (subFilter !== "all") {
          const r = rewards.find(r => r.id === subFilter);
          if (r && !(tx.description || "").includes(r.title)) return false;
          if (!r) return false;
        }
      } else if (typeFilter === "bonus") {
        if (!isBonus(tx)) return false;
        if (subFilter !== "all") {
          if (getBonusKind(tx) !== subFilter) return false;
        }
      }
      return true;
    });
  }, [windowTx, search, typeFilter, subFilter, rewards, nfcCards]);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hasMore = filtered.length > INITIAL_COUNT;

  const clearFilters = () => { setSearch(""); setTypeFilter("all"); setSubFilter("all"); };
  const hasActiveFilters = search || typeFilter !== "all" || subFilter !== "all";

  // KPIs (based on windowTx)
  const periodLabel = viewMode === "total" ? "gesamt" : "im Zeitraum";
  const pointsGiven = windowTx.filter(isStamp).reduce((s, tx) => s + tx.points_change, 0)
    + windowTx.filter(isBonus).reduce((s, tx) => s + tx.points_change, 0);
  const redemptionsCount = windowTx.filter(isRedemption).length;
  const cardScans = windowTx.filter(tx => isStamp(tx) || isRedemption(tx)).length;
  // Customer growth: number of NEW loyalty accounts in window (or total in 'total')
  const newCustomers = useMemo(() => {
    if (viewMode === "total") return allLoyaltyAccounts.length;
    return allLoyaltyAccounts.filter(a => {
      const d = new Date(a.created_at); return d >= dateFrom && d <= dateTo;
    }).length;
  }, [allLoyaltyAccounts, viewMode, dateFrom, dateTo]);

  // Hourly chart data — derived from windowTx (stamps only)
  const hourlyData: HourlyData[] = useMemo(() => {
    const hc: Record<number, number> = {}; for (let i = 0; i < 24; i++) hc[i] = 0;
    windowTx.filter(isStamp).forEach(tx => { hc[new Date(tx.created_at).getHours()]++; });
    return Object.entries(hc).map(([h, c]) => ({ hour: `${h}:00`, count: c }));
  }, [windowTx]);

  // Growth chart — cumulative loyalty accounts within window (or total)
  const growthData: GrowthData[] = useMemo(() => {
    const start = viewMode === "total"
      ? (allLoyaltyAccounts[0] ? new Date(allLoyaltyAccounts[0].created_at) : new Date())
      : dateFrom;
    const end = viewMode === "total" ? new Date() : dateTo;
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24*60*60*1000)));
    const buckets: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      buckets[d.toISOString().split("T")[0]] = 0;
    }
    let baseCum = 0;
    allLoyaltyAccounts.forEach(a => {
      const d = new Date(a.created_at);
      if (d < start) baseCum++;
      else if (d <= end) {
        const k = d.toISOString().split("T")[0];
        if (buckets.hasOwnProperty(k)) buckets[k]++;
      }
    });
    let cum = baseCum;
    return Object.entries(buckets).sort(([a],[b]) => a.localeCompare(b)).map(([d, c]) => {
      cum += c;
      return { date: new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), total: cum };
    });
  }, [allLoyaltyAccounts, viewMode, dateFrom, dateTo]);

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'nfc_stamp': return 'Karte';
      case 'reward_redeemed': return 'Einlösung';
      case 'offer_redeemed': return 'Angebot';
      case 'google_review': return 'Bewertung';
      case 'birthday_bonus': return 'Geburtstag';
      case 'welcome_bonus': return 'Willkommen';
      case 'referral_bonus': return 'Einladung';
      case 'double_points': return 'Doppelte Punkte';
      default: return type || 'Sonstig';
    }
  };

  const getTypeBadgeStyle = (type: string | null) => {
    switch (type) {
      case 'nfc_stamp': return 'bg-primary/10 text-primary border-primary/20';
      case 'reward_redeemed': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'offer_redeemed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'google_review': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Sub-filter options
  const subFilterOptions = (() => {
    if (typeFilter === "stamps") {
      return [{ value: "all", label: "Alle Karten" }, ...nfcCards.map(c => ({ value: c.id, label: c.name || `${c.points} Punkte (${c.color || 'Karte'})` }))];
    }
    if (typeFilter === "redemptions") {
      return [{ value: "all", label: "Alle Prämien" }, ...rewards.map(r => ({ value: r.id, label: r.title }))];
    }
    if (typeFilter === "bonus") {
      return [
        { value: "all", label: "Alle Boni" },
        { value: "referral", label: "Einladungsbonus" },
        { value: "double", label: "Doppelte Punkte" },
        { value: "welcome", label: "Willkommensbonus" },
        { value: "birthday", label: "Geburtstagsbonus" },
        { value: "review", label: "Bewertungsbonus" },
      ];
    }
    return null;
  })();

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Kunden & Transaktionen</h1>
          <p className="text-muted-foreground mt-1 text-sm">Aktivitäten, Analysen und Kundeneinblicke</p>
        </div>

        {/* GLOBAL TIME CONTROL */}
        <Card className="rounded-2xl border-border/40 shadow-[0_2px_12px_hsl(262,30%,80%/0.25)] bg-gradient-to-br from-white to-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl bg-white/70 p-1 border border-border/40">
                  <button
                    onClick={() => setViewMode("total")}
                    className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-all", viewMode === "total" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >Gesamt</button>
                  <button
                    onClick={() => setViewMode("range")}
                    className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-all", viewMode === "range" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >Zeitraum</button>
                </div>
              </div>
              {viewMode === "range" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[7, 14, 30, 90].map(d => (
                    <button
                      key={d}
                      onClick={() => setQuickRange(d as QuickRange)}
                      className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all", quickRange === d ? "bg-primary/15 text-primary border border-primary/30" : "bg-white/60 text-muted-foreground hover:bg-white/90 border border-transparent")}
                    >{d} Tage</button>
                  ))}
                </div>
              )}
            </div>
            {viewMode === "range" && (
              <div className="grid grid-cols-2 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="group flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-white px-4 py-3 hover:border-primary/50 hover:shadow-sm transition-all text-left">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Von</p>
                        <p className="text-base font-bold text-foreground">{format(dateFrom, "d. MMM yyyy", { locale: de })}</p>
                      </div>
                      <CalendarDays className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={(d) => { if (d) { const nd = new Date(d); nd.setHours(0,0,0,0); setDateFrom(nd); setQuickRange(null); } }} className="p-3 pointer-events-auto" locale={de} />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="group flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-white px-4 py-3 hover:border-primary/50 hover:shadow-sm transition-all text-left">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bis</p>
                        <p className="text-base font-bold text-foreground">{format(dateTo, "d. MMM yyyy", { locale: de })}</p>
                      </div>
                      <CalendarDays className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={(d) => { if (d) { const nd = new Date(d); nd.setHours(23,59,59,999); setDateTo(nd); setQuickRange(null); } }} className="p-3 pointer-events-auto" locale={de} />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: `Punkte vergeben ${periodLabel}`, value: pointsGiven, icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
            { label: `Einlösungen ${periodLabel}`, value: redemptionsCount, icon: Gift, color: "text-amber-600", bg: "bg-amber-100" },
            { label: `Kartenscans ${periodLabel}`, value: cardScans, icon: ScanLine, color: "text-secondary", bg: "bg-secondary/10" },
            { label: `Kundenzuwachs ${periodLabel}`, value: `+${newCustomers}`, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map(kpi => (
            <Card key={kpi.label} className="rounded-xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] bg-white">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", kpi.bg)}>
                  <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground tabular-nums">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT: Transactions */}
          <div className="space-y-4">
            {/* Filters */}
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Filter</p>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground text-xs h-6">Zurücksetzen</Button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-lg border-border/60 bg-background text-sm" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px] h-8 rounded-lg border-border/60 bg-background text-xs">
                      <Filter className="w-3 h-3 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Alle Typen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Typen</SelectItem>
                      <SelectItem value="stamps">Karte</SelectItem>
                      <SelectItem value="redemptions">Einlösungen</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                  {subFilterOptions && subFilterOptions.length > 1 && (
                    <Select value={subFilter} onValueChange={setSubFilter}>
                      <SelectTrigger className="w-[180px] h-8 rounded-lg border-border/60 bg-background text-xs">
                        {typeFilter === "stamps" ? <Nfc className="w-3 h-3 mr-1 text-muted-foreground" />
                          : typeFilter === "redemptions" ? <Gift className="w-3 h-3 mr-1 text-muted-foreground" />
                          : <Sparkles className="w-3 h-3 mr-1 text-muted-foreground" />}
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {subFilterOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results count */}
            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "Transaktion" : "Transaktionen"}{hasActiveFilters ? " gefiltert" : ""} · {viewMode === "total" ? "Gesamt" : `${format(dateFrom, "dd.MM.")} – ${format(dateTo, "dd.MM.yyyy")}`}
            </p>

            {/* Transaction List */}
            <div className="space-y-1.5">
              {filtered.length === 0 ? (
                <Card className="rounded-xl border-border/50">
                  <CardContent className="py-12 text-center">
                    <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm font-medium">Keine Transaktionen gefunden</p>
                    {hasActiveFilters && <Button variant="link" onClick={clearFilters} className="mt-1 text-primary text-sm">Filter zurücksetzen</Button>}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {displayed.map((tx) => (
                    <div key={tx.id} className="group bg-white rounded-lg px-3.5 py-3 border border-border/30 flex items-center justify-between hover:shadow-[0_2px_8px_hsl(262,30%,80%/0.3)] hover:border-primary/20 transition-all duration-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", tx.points_change > 0 ? 'bg-emerald-100' : 'bg-amber-100')}>
                          {tx.points_change > 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <Gift className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{tx.description || getTypeLabel(tx.transaction_type)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {tx.transaction_type && (
                          <Badge variant="outline" className={cn("rounded-full text-[10px] px-2 py-0.5 hidden sm:inline-flex font-medium", getTypeBadgeStyle(tx.transaction_type))}>
                            {getTypeLabel(tx.transaction_type)}
                          </Badge>
                        )}
                        <span className={cn("font-bold text-sm tabular-nums", tx.points_change > 0 ? 'text-emerald-600' : 'text-amber-600')}>
                          {tx.points_change > 0 ? '+' : ''}{tx.points_change}
                        </span>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <Button variant="ghost" className="w-full mt-1 text-muted-foreground hover:text-foreground text-sm" onClick={() => setShowAll(!showAll)}>
                      {showAll ? <>Weniger anzeigen <ChevronUp className="w-4 h-4 ml-1" /></> : <>Alle {filtered.length} anzeigen <ChevronDown className="w-4 h-4 ml-1" /></>}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Analytics Sidebar */}
          <div className="space-y-4">
            {/* Kundenzuwachs */}
            <div className="bg-white rounded-xl p-4 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Kundenzuwachs</h3></div>
                <span className="text-[10px] text-muted-foreground">{viewMode === "total" ? "Gesamt" : `${quickRange ? quickRange + 'T' : 'Custom'}`}</span>
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs><linearGradient id="colorGrowthT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(growthData.length / 5))} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} width={30} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(0,0%,100%)", border: "1px solid hsl(0,0%,90%)", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}`, "Kunden"]} />
                    <Area type="monotone" dataKey="total" stroke="#22C55E" strokeWidth={2} fill="url(#colorGrowthT)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sammelzeiten */}
            <div className="bg-white rounded-xl p-4 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Sammelzeiten</h3></div>
                <span className="text-[10px] text-muted-foreground">{viewMode === "total" ? "Gesamt" : `${quickRange ? quickRange + 'T' : 'Custom'}`}</span>
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs><linearGradient id="colorHourT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(262,83%,58%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} width={30} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(0,0%,100%)", border: "1px solid hsl(0,0%,90%)", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}`, "Karte"]} />
                    <Area type="monotone" dataKey="count" stroke="hsl(262,83%,58%)" strokeWidth={2} fill="url(#colorHourT)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Kundengruppen */}
            <div className="bg-white rounded-xl p-4 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <h3 className="text-sm font-semibold text-foreground mb-3">Kundengruppen</h3>
              <div className="space-y-2">
                {segments.map(seg => {
                  const segTooltips: Record<string, string> = {
                    "Neu": "Kunden, die einmal gescannt haben",
                    "Kunden": "Kunden, die 2–5 mal gescannt haben",
                    "Stammkunden": "Kunden, die 6–15 mal gescannt haben",
                    "VIP-Stammkunden": "Kunden, die mehr als 15 mal gescannt haben",
                  };
                  return (
                    <Tooltip key={seg.name}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-3 cursor-default">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">{seg.name}</span>
                              <span className="text-xs text-muted-foreground">{seg.percentage}%</span>
                            </div>
                            <div className="h-1.5 bg-muted/50 rounded-full mt-1 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }} />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{seg.count}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        {segTooltips[seg.name] || seg.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* Demografie */}
            <div className="bg-white rounded-xl p-4 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <h3 className="text-sm font-semibold text-foreground mb-3">Demografie</h3>
              <div className="flex items-center gap-4 mb-4">
                {genderData.map(g => (
                  <div key={g.gender} className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", g.gender === "Männlich" ? "bg-primary" : "bg-orange-500")} />
                    <span className="text-xs text-foreground font-medium">{g.gender}</span>
                    <span className="text-xs text-muted-foreground">{g.percentage}%</span>
                  </div>
                ))}
              </div>
              <div className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} barGap={1} barCategoryGap="20%">
                    <XAxis dataKey="age" tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(0,0%,100%)", border: "1px solid hsl(0,0%,90%)", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number, name: string) => [`${v}`, name === 'male' ? 'Männlich' : 'Weiblich']} />
                    <Bar dataKey="male" fill="hsl(262,83%,58%)" radius={[3, 3, 0, 0]} name="male" />
                    <Bar dataKey="female" fill="#F97316" radius={[3, 3, 0, 0]} name="female" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
