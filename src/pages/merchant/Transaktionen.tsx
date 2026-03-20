import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { 
  Loader2, TrendingUp, Gift, Search, Filter, CalendarDays, 
  ChevronDown, ChevronUp, Stamp, Star, Activity
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface Transaction {
  id: string;
  created_at: string;
  points_change: number;
  transaction_type: string | null;
  description: string | null;
}

interface Reward {
  id: string;
  title: string;
}

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

  const INITIAL_COUNT = 20;

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const customer = await getUserCustomer(user!.id);
      if (!customer) return;

      const [txResult, rewardResult] = await Promise.all([
        supabase
          .from("point_transactions")
          .select("id, created_at, points_change, transaction_type, description")
          .eq("merchant_customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("rewards")
          .select("id, title")
          .eq("merchant_customer_id", customer.id)
          .eq("is_active", true),
      ]);

      setTransactions(txResult.data || []);
      setRewards(rewardResult.data || []);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (search) {
        const text = (tx.description || tx.transaction_type || "").toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }
      if (typeFilter === "stamps") {
        if (tx.transaction_type !== "nfc_stamp") return false;
      } else if (typeFilter === "redemptions") {
        if (tx.transaction_type !== "reward_redeemed" && tx.points_change >= 0) return false;
      } else if (typeFilter === "bonus") {
        if (tx.transaction_type === "nfc_stamp" || tx.transaction_type === "reward_redeemed") return false;
        if (tx.points_change <= 0) return false;
      }
      if (rewardFilter !== "all") {
        const rewardTitle = rewards.find(r => r.id === rewardFilter)?.title;
        if (rewardTitle && !(tx.description || "").includes(rewardTitle)) return false;
        if (!rewardTitle) return false;
      }
      if (dateFrom) {
        if (new Date(tx.created_at) < dateFrom) return false;
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (new Date(tx.created_at) > endOfDay) return false;
      }
      return true;
    });
  }, [transactions, search, typeFilter, rewardFilter, dateFrom, dateTo, rewards]);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hasMore = filtered.length > INITIAL_COUNT;

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setRewardFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = search || typeFilter !== "all" || rewardFilter !== "all" || dateFrom || dateTo;

  // KPIs
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTx = transactions.filter(tx => tx.created_at.startsWith(todayStr));
  const todayStamps = todayTx.filter(tx => tx.transaction_type === "nfc_stamp").reduce((s, tx) => s + tx.points_change, 0);
  const todayRedemptions = todayTx.filter(tx => tx.points_change < 0).length;
  const todayBonus = todayTx.filter(tx => tx.transaction_type !== "nfc_stamp" && tx.transaction_type !== "reward_redeemed" && tx.points_change > 0).reduce((s, tx) => s + tx.points_change, 0);

  const kpis = [
    { label: "Stempel heute", value: todayStamps, icon: Stamp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Einlösungen heute", value: todayRedemptions, icon: Gift, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Bonuspunkte heute", value: todayBonus, icon: Star, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Gesamt-Transaktionen", value: transactions.length, icon: Activity, color: "text-secondary", bg: "bg-secondary/10" },
  ];

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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Kunden & Transaktionen</h1>
          <p className="text-muted-foreground mt-1">
            Alle Kundenaktivitäten auf einen Blick – Stempel, Einlösungen und Boni
          </p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.3)] transition-all duration-300 bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", kpi.bg)}>
                  <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Filter</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground text-xs h-7">
                  Zurücksetzen
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl border-border/60 bg-background"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] rounded-xl border-border/60 bg-background">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
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
                  <SelectTrigger className="w-[180px] rounded-xl border-border/60 bg-background">
                    <Gift className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Alle Prämien" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Prämien</SelectItem>
                    {rewards.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("rounded-xl gap-1.5 border-border/60", dateFrom && "border-primary text-primary")}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    {dateFrom ? format(dateFrom, "dd.MM.yy", { locale: de }) : "Von"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" locale={de} />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("rounded-xl gap-1.5 border-border/60", dateTo && "border-primary text-primary")}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    {dateTo ? format(dateTo, "dd.MM.yy", { locale: de }) : "Bis"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" locale={de} />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "Transaktion" : "Transaktionen"}
          {hasActiveFilters ? " gefiltert" : ""}
        </p>

        {/* Transaction List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="py-16 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Keine Transaktionen gefunden</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                    Filter zurücksetzen
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {displayed.map((tx) => (
                <div
                  key={tx.id}
                  className="group bg-white rounded-xl p-4 border border-border/30 flex items-center justify-between hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.3)] hover:border-primary/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      tx.points_change > 0 ? 'bg-emerald-100' : 'bg-amber-100'
                    )}>
                      {tx.points_change > 0 ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Gift className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.description || getTypeLabel(tx.transaction_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {tx.transaction_type && (
                      <Badge variant="outline" className={cn("rounded-full text-[10px] px-2 py-0.5 hidden sm:inline-flex font-medium", getTypeBadgeStyle(tx.transaction_type))}>
                        {getTypeLabel(tx.transaction_type)}
                      </Badge>
                    )}
                    <span className={cn(
                      "font-bold text-base tabular-nums",
                      tx.points_change > 0 ? 'text-emerald-600' : 'text-amber-600'
                    )}>
                      {tx.points_change > 0 ? '+' : ''}{tx.points_change}
                    </span>
                  </div>
                </div>
              ))}

              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? (
                    <>Weniger anzeigen <ChevronUp className="w-4 h-4 ml-1" /></>
                  ) : (
                    <>Alle {filtered.length} anzeigen <ChevronDown className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
