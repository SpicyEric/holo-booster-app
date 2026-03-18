import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Loader2, TrendingUp, Gift, Search, Filter, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
      // Text search
      if (search) {
        const text = (tx.description || tx.transaction_type || "").toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }

      // Type filter
      if (typeFilter === "stamps") {
        if (tx.transaction_type !== "nfc_stamp") return false;
      } else if (typeFilter === "redemptions") {
        if (tx.transaction_type !== "reward_redeemed" && tx.points_change >= 0) return false;
      } else if (typeFilter === "bonus") {
        if (tx.transaction_type === "nfc_stamp" || tx.transaction_type === "reward_redeemed") return false;
        if (tx.points_change <= 0) return false;
      }

      // Reward filter
      if (rewardFilter !== "all") {
        const rewardTitle = rewards.find(r => r.id === rewardFilter)?.title;
        if (rewardTitle && !(tx.description || "").includes(rewardTitle)) return false;
        if (!rewardTitle) return false;
      }

      // Date filter
      if (dateFrom) {
        const txDate = new Date(tx.created_at);
        if (txDate < dateFrom) return false;
      }
      if (dateTo) {
        const txDate = new Date(tx.created_at);
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (txDate > endOfDay) return false;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaktionen</h1>
            <p className="text-gray-500 mt-1">
              {filtered.length} {filtered.length === 1 ? "Transaktion" : "Transaktionen"}
              {hasActiveFilters ? " (gefiltert)" : ""}
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
              Filter zurücksetzen
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] rounded-xl">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
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
                <SelectTrigger className="w-[200px] rounded-xl">
                  <Gift className="w-4 h-4 mr-2 text-gray-400" />
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
                <Button variant="outline" className={cn("rounded-xl gap-2", dateFrom && "border-primary")}>
                  <CalendarDays className="w-4 h-4" />
                  {dateFrom ? format(dateFrom, "dd.MM.yy", { locale: de }) : "Von"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  className={cn("p-3 pointer-events-auto")}
                  locale={de}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("rounded-xl gap-2", dateTo && "border-primary")}>
                  <CalendarDays className="w-4 h-4" />
                  {dateTo ? format(dateTo, "dd.MM.yy", { locale: de }) : "Bis"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  className={cn("p-3 pointer-events-auto")}
                  locale={de}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Keine Transaktionen gefunden</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          ) : (
            <>
              {displayed.map((tx) => (
                <div key={tx.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.points_change > 0 ? 'bg-green-100' : tx.points_change < 0 ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      {tx.points_change > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <Gift className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tx.description || tx.transaction_type || 'Transaktion'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tx.transaction_type && (
                      <Badge variant="outline" className="rounded-full text-xs hidden sm:inline-flex">
                        {tx.transaction_type === 'nfc_stamp' ? 'Stempel' 
                          : tx.transaction_type === 'reward_redeemed' ? 'Einlösung'
                          : tx.transaction_type === 'offer_redeemed' ? 'Angebot'
                          : tx.transaction_type}
                      </Badge>
                    )}
                    <span className={`font-bold text-lg ${
                      tx.points_change > 0 ? 'text-green-600' : tx.points_change < 0 ? 'text-amber-600' : 'text-blue-600'
                    }`}>
                      {tx.points_change > 0 ? '+' : ''}{tx.points_change}
                    </span>
                  </div>
                </div>
              ))}

              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-gray-500"
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
