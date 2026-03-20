import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { 
  Loader2, TrendingUp, Gift, Search, Filter, CalendarDays, 
  ChevronDown, ChevronUp, Stamp, Star, Activity, Clock, Users
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
interface HourlyData { hour: string; count: number; }
interface GrowthData { date: string; total: number; }
interface GenderData { gender: string; count: number; percentage: number; }
interface AgeData { age: string; count: number; male: number; female: number; }
interface CustomerSegment { name: string; label: string; count: number; percentage: number; color: string; }

type DateRange = 7 | 14 | 30 | 90;

const DEMO_MERCHANT_ID = "e8e3db26-fd15-455a-ad47-50ed25081e3c";

const DateRangeSelector = ({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) => (
  <div className="flex gap-1">
    {([7, 14, 30, 90] as DateRange[]).map(d => (
      <button key={d} className={`px-2.5 py-1 text-xs rounded-full transition-all duration-200 font-medium ${value === d ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-white/60 text-muted-foreground hover:bg-white/80'}`} onClick={() => onChange(d)}>{d}T</button>
    ))}
  </div>
);

export default function Transaktionen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [rewardFilter, setRewardFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showAll, setShowAll] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Analytics state
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [hourlyRange, setHourlyRange] = useState<DateRange>(30);
  const [growthRange, setGrowthRange] = useState<DateRange>(7);

  const INITIAL_COUNT = 20;

  useEffect(() => { if (user) loadData(); }, [user]);
  useEffect(() => { if (customerId) loadHourlyData(customerId); }, [customerId, hourlyRange]);
  useEffect(() => { if (customerId) loadGrowthData(customerId); }, [customerId, growthRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const customer = await getUserCustomer(user!.id);
      if (!customer) return;
      setCustomerId(customer.id);

      const isDemo = customer.id === DEMO_MERCHANT_ID;

      const [txResult, rewardResult] = await Promise.all([
        supabase.from("point_transactions").select("id, created_at, points_change, transaction_type, description").eq("merchant_customer_id", customer.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("rewards").select("id, title").eq("merchant_customer_id", customer.id).eq("is_active", true),
      ]);

      setTransactions(txResult.data || []);
      setRewards(rewardResult.data || []);

      if (isDemo) {
        const p = [2,3,1,0,0,0,8,45,120,280,350,380,320,290,340,410,450,420,280,150,80,35,15,5];
        setHourlyData(p.map((c,h) => ({ hour: `${h}:00`, count: c })));
        const gd: GrowthData[] = []; let base = 2400 - Math.floor(7 * 6.5);
        for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate()-(6-i)); base += Math.floor(4+Math.random()*8); gd.push({ date: d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}), total: base }); }
        setGrowthData(gd);
        setGenderData([{ gender: "Männlich", count: 1560, percentage: 65 },{ gender: "Weiblich", count: 840, percentage: 35 }]);
        setAgeData([{age:"14-17",count:96,male:58,female:38},{age:"18-24",count:384,male:245,female:139},{age:"25-34",count:720,male:468,female:252},{age:"35-44",count:576,male:374,female:202},{age:"45-54",count:384,male:250,female:134},{age:"55-64",count:168,male:109,female:59},{age:"65+",count:72,male:47,female:25}]);
        setSegments([
          { name: "Neu", label: "1 Besuch", count: 480, percentage: 20, color: "#22C55E" },
          { name: "Selten", label: "2-5 Besuche", count: 720, percentage: 30, color: "#A855F7" },
          { name: "Treu", label: "6-15 Besuche", count: 840, percentage: 35, color: "#3B82F6" },
          { name: "VIP", label: "15+ Besuche", count: 360, percentage: 15, color: "#F97316" }
        ]);
      } else {
        await Promise.all([
          loadHourlyData(customer.id),
          loadGrowthData(customer.id),
          loadGenderData(customer.id),
          loadAgeData(customer.id),
          loadCustomerSegments(customer.id),
        ]);
      }
    } catch (err) { console.error("Error loading transactions:", err); } finally { setLoading(false); }
  };

  const loadHourlyData = async (cid: string) => {
    if (cid === DEMO_MERCHANT_ID) return;
    const s = new Date(); s.setDate(s.getDate() - hourlyRange);
    const { data: txs } = await supabase.from("point_transactions").select("created_at").eq("merchant_customer_id", cid).gt("points_change", 0).gte("created_at", s.toISOString());
    const hc: Record<number, number> = {}; for (let i = 0; i < 24; i++) hc[i] = 0;
    (txs || []).forEach((t: any) => { if (t.created_at) hc[new Date(t.created_at).getHours()]++; });
    setHourlyData(Object.entries(hc).map(([h, c]) => ({ hour: `${h}:00`, count: c })));
  };

  const loadGrowthData = async (cid: string) => {
    if (cid === DEMO_MERCHANT_ID) return;
    const s = new Date(); s.setDate(s.getDate() - growthRange);
    const { data: all } = await supabase.from("loyalty_accounts").select("created_at").eq("merchant_customer_id", cid).order("created_at", { ascending: true });
    const dc: Record<string, number> = {};
    for (let i = 0; i < growthRange; i++) { const d = new Date(); d.setDate(d.getDate() - (growthRange - 1 - i)); dc[d.toISOString().split("T")[0]] = 0; }
    (all || []).forEach((a: any) => { if (a.created_at) { const ds = a.created_at.split("T")[0]; if (dc.hasOwnProperty(ds)) dc[ds]++; } });
    let cum = 0; const rs = new Date(); rs.setDate(rs.getDate() - growthRange);
    (all || []).forEach((a: any) => { if (a.created_at && new Date(a.created_at) < rs) cum++; });
    setGrowthData(Object.entries(dc).sort(([a], [b]) => a.localeCompare(b)).map(([d, c]) => { cum += c; return { date: new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), total: cum }; }));
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
    if (!la || la.length === 0) { setSegments([{ name: "Neu", label: "1 Besuch", count: 0, percentage: 0, color: "#22C55E" }, { name: "Selten", label: "2-5 Besuche", count: 0, percentage: 0, color: "#A855F7" }, { name: "Treu", label: "6-15 Besuche", count: 0, percentage: 0, color: "#3B82F6" }, { name: "VIP", label: "15+ Besuche", count: 0, percentage: 0, color: "#F97316" }]); return; }
    const utc: Record<string, number> = {};
    for (const acc of la) { const { count } = await supabase.from("point_transactions").select("*", { count: "exact", head: true }).eq("merchant_customer_id", cid).eq("loyalty_account_id", acc.id).eq("transaction_type", "nfc_stamp"); utc[acc.id] = count || 0; }
    let n = 0, s = 0, t2 = 0, v = 0; Object.values(utc).forEach(c => { if (c <= 1) n++; else if (c <= 5) s++; else if (c <= 15) t2++; else v++; });
    const tot = la.length;
    setSegments([{ name: "Neu", label: "1 Besuch", count: n, percentage: tot > 0 ? Math.round(n / tot * 100) : 0, color: "#22C55E" }, { name: "Selten", label: "2-5 Besuche", count: s, percentage: tot > 0 ? Math.round(s / tot * 100) : 0, color: "#A855F7" }, { name: "Treu", label: "6-15 Besuche", count: t2, percentage: tot > 0 ? Math.round(t2 / tot * 100) : 0, color: "#3B82F6" }, { name: "VIP", label: "15+ Besuche", count: v, percentage: tot > 0 ? Math.round(v / tot * 100) : 0, color: "#F97316" }]);
  };

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (search) {
        const text = (tx.description || tx.transaction_type || "").toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }
      if (typeFilter === "stamps") { if (tx.transaction_type !== "nfc_stamp") return false; }
      else if (typeFilter === "redemptions") { if (tx.transaction_type !== "reward_redeemed" && tx.points_change >= 0) return false; }
      else if (typeFilter === "bonus") { if (tx.transaction_type === "nfc_stamp" || tx.transaction_type === "reward_redeemed") return false; if (tx.points_change <= 0) return false; }
      if (rewardFilter !== "all") { const rt = rewards.find(r => r.id === rewardFilter)?.title; if (rt && !(tx.description || "").includes(rt)) return false; if (!rt) return false; }
      if (dateFrom) { if (new Date(tx.created_at) < dateFrom) return false; }
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); if (new Date(tx.created_at) > end) return false; }
      return true;
    });
  }, [transactions, search, typeFilter, rewardFilter, dateFrom, dateTo, rewards]);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hasMore = filtered.length > INITIAL_COUNT;

  const clearFilters = () => { setSearch(""); setTypeFilter("all"); setRewardFilter("all"); setDateFrom(undefined); setDateTo(undefined); };
  const hasActiveFilters = search || typeFilter !== "all" || rewardFilter !== "all" || dateFrom || dateTo;

  // KPIs
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTx = transactions.filter(tx => tx.created_at.startsWith(todayStr));
  const todayStamps = todayTx.filter(tx => tx.transaction_type === "nfc_stamp").reduce((s, tx) => s + tx.points_change, 0);
  const todayRedemptions = todayTx.filter(tx => tx.points_change < 0).length;

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'nfc_stamp': return 'Stempel';
      case 'reward_redeemed': return 'Einlösung';
      case 'offer_redeemed': return 'Angebot';
      case 'google_review': return 'Bewertung';
      case 'birthday_bonus': return 'Geburtstag';
      case 'welcome_bonus': return 'Willkommen';
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

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Kunden & Transaktionen</h1>
          <p className="text-muted-foreground mt-1 text-sm">Aktivitäten, Analysen und Kundeneinblicke</p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Stempel heute", value: todayStamps, icon: Stamp, color: "text-primary", bg: "bg-primary/10" },
            { label: "Einlösungen heute", value: todayRedemptions, icon: Gift, color: "text-amber-600", bg: "bg-amber-100" },
            { label: "Gesamt-Transaktionen", value: transactions.length, icon: Activity, color: "text-secondary", bg: "bg-secondary/10" },
            { label: "Kunden-Segmente", value: segments.reduce((s, seg) => s + seg.count, 0), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
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
                    <SelectTrigger className="w-[140px] h-8 rounded-lg border-border/60 bg-background text-xs">
                      <Filter className="w-3 h-3 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Alle Typen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Typen</SelectItem>
                      <SelectItem value="stamps">Stempel</SelectItem>
                      <SelectItem value="redemptions">Einlösungen</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                  {rewards.length > 0 && (
                    <Select value={rewardFilter} onValueChange={setRewardFilter}>
                      <SelectTrigger className="w-[160px] h-8 rounded-lg border-border/60 bg-background text-xs">
                        <Gift className="w-3 h-3 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="Alle Prämien" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Prämien</SelectItem>
                        {rewards.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("rounded-lg gap-1 border-border/60 h-8 text-xs", dateFrom && "border-primary text-primary")}>
                        <CalendarDays className="w-3 h-3" />{dateFrom ? format(dateFrom, "dd.MM.yy", { locale: de }) : "Von"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" locale={de} /></PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("rounded-lg gap-1 border-border/60 h-8 text-xs", dateTo && "border-primary text-primary")}>
                        <CalendarDays className="w-3 h-3" />{dateTo ? format(dateTo, "dd.MM.yy", { locale: de }) : "Bis"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" locale={de} /></PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Results count */}
            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "Transaktion" : "Transaktionen"}{hasActiveFilters ? " gefiltert" : ""}
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
                <DateRangeSelector value={growthRange} onChange={setGrowthRange} />
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs><linearGradient id="colorGrowthT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(growthRange / 5))} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} width={30} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(0,0%,100%)", border: "1px solid hsl(0,0%,90%)", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}`, "Kunden"]} />
                    <Area type="monotone" dataKey="total" stroke="#22C55E" strokeWidth={2} fill="url(#colorGrowthT)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stempelzeiten */}
            <div className="bg-white rounded-xl p-4 border border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Stempelzeiten</h3></div>
                <DateRangeSelector value={hourlyRange} onChange={setHourlyRange} />
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs><linearGradient id="colorHourT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(262,83%,58%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(0,0%,45%)' }} tickLine={false} axisLine={false} width={30} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(0,0%,100%)", border: "1px solid hsl(0,0%,90%)", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}`, "Stempel"]} />
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
                    "Neu": "Kunden, die einmal gestempelt haben",
                    "Selten": "Kunden, die 2–5 mal gestempelt haben",
                    "Treu": "Kunden, die 6–15 mal gestempelt haben",
                    "VIP": "Kunden, die mehr als 15 mal gestempelt haben",
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
              {/* Gender */}
              <div className="flex items-center gap-4 mb-4">
                {genderData.map(g => (
                  <div key={g.gender} className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", g.gender === "Männlich" ? "bg-primary" : "bg-orange-500")} />
                    <span className="text-xs text-foreground font-medium">{g.gender}</span>
                    <span className="text-xs text-muted-foreground">{g.percentage}%</span>
                  </div>
                ))}
              </div>
              {/* Age */}
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
