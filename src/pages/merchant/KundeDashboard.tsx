import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Users, Trophy, Gift, Clock, Star, TrendingUp,
  AlertTriangle, Pause, Activity, UserCheck, UserX
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

interface Customer {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  status: string;
  customer_number: number | null;
}

interface SubscriptionInfo {
  hasSubscription: boolean;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
}

interface DashboardStats {
  totalContacts: number;
  totalStamps: number;
  totalRedemptions: number;
  pulsCount: number;
  newContacts7Days: number;
}

interface HourlyData {
  hour: string;
  count: number;
}

interface GrowthData {
  date: string;
  total: number;
}

interface GenderData {
  gender: string;
  count: number;
  percentage: number;
}

interface AgeData {
  age: string;
  count: number;
}

interface CustomerSegment {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface Transaction {
  id: string;
  created_at: string;
  points_change: number;
  transaction_type: string;
  description: string;
  user_id: string;
}

type DateRange = 7 | 14 | 30 | 90;

const DateRangeSelector = ({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) => (
  <div className="flex gap-1">
    {([7, 14, 30, 90] as DateRange[]).map((days) => (
      <Button
        key={days}
        variant={value === days ? "default" : "outline"}
        size="sm"
        className="h-6 text-xs px-2"
        onClick={() => onChange(days)}
      >
        {days}T
      </Button>
    ))}
  </div>
);

export default function KundeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Chart data states
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Date range states
  const [hourlyRange, setHourlyRange] = useState<DateRange>(30);
  const [growthRange, setGrowthRange] = useState<DateRange>(7);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (customer?.id) {
      loadHourlyData(customer.id);
    }
  }, [customer?.id, hourlyRange]);

  useEffect(() => {
    if (customer?.id) {
      loadGrowthData(customer.id);
    }
  }, [customer?.id, growthRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      let customerData = null;
      if (user?.id) {
        customerData = await getUserCustomer(user.id);
        if (customerData) {
          setCustomer({
            id: customerData.id,
            name: customerData.name,
            email: customerData.email || user.email || "",
            company_name: customerData.company_name,
            status: customerData.status || "active",
            customer_number: customerData.customer_number
          });
        }
      }

      // Load subscription info
      try {
        const { data: subInfo } = await supabase.functions.invoke("get-subscription-info");
        if (subInfo) setSubscriptionInfo(subInfo);
      } catch (e) {}

      if (customerData?.id) {
        await Promise.all([
          loadDashboardStats(customerData.id),
          loadHourlyData(customerData.id),
          loadGrowthData(customerData.id),
          loadGenderData(customerData.id),
          loadAgeData(customerData.id),
          loadCustomerSegments(customerData.id),
          loadRecentTransactions(customerData.id)
        ]);
      } else {
        setStats({ totalContacts: 0, totalStamps: 0, totalRedemptions: 0, pulsCount: 0, newContacts7Days: 0 });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (customerId: string) => {
    try {
      // Total loyalty accounts (contacts)
      const { count: totalContacts } = await supabase
        .from("loyalty_accounts")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId);

      // Total stamps (point_transactions with positive points)
      const { count: totalStamps } = await supabase
        .from("point_transactions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .gt("points_change", 0);

      // Total redemptions
      const { count: totalRedemptions } = await supabase
        .from("reward_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId);

      // Puls: Users who have loyalty accounts at OTHER merchants too
      const { data: loyaltyAccounts } = await supabase
        .from("loyalty_accounts")
        .select("user_id")
        .eq("merchant_customer_id", customerId);

      let pulsCount = 0;
      if (loyaltyAccounts && loyaltyAccounts.length > 0) {
        const userIds = loyaltyAccounts.map(acc => acc.user_id);
        const { data: otherAccounts } = await supabase
          .from("loyalty_accounts")
          .select("user_id")
          .neq("merchant_customer_id", customerId)
          .in("user_id", userIds);
        
        const uniquePulsUsers = new Set(otherAccounts?.map(acc => acc.user_id) || []);
        pulsCount = uniquePulsUsers.size;
      }

      // New contacts in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: newContacts7Days } = await supabase
        .from("loyalty_accounts")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .gte("created_at", sevenDaysAgo.toISOString());

      setStats({
        totalContacts: totalContacts || 0,
        totalStamps: totalStamps || 0,
        totalRedemptions: totalRedemptions || 0,
        pulsCount,
        newContacts7Days: newContacts7Days || 0
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({ totalContacts: 0, totalStamps: 0, totalRedemptions: 0, pulsCount: 0, newContacts7Days: 0 });
    }
  };

  const loadHourlyData = async (customerId: string) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - hourlyRange);

    const { data: transactions } = await supabase
      .from("point_transactions")
      .select("created_at")
      .eq("merchant_customer_id", customerId)
      .gt("points_change", 0)
      .gte("created_at", startDate.toISOString());

    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;

    (transactions || []).forEach((tx: any) => {
      if (tx.created_at) {
        const hour = new Date(tx.created_at).getHours();
        hourCounts[hour]++;
      }
    });

    setHourlyData(Object.entries(hourCounts).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count
    })));
  };

  const loadGrowthData = async (customerId: string) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - growthRange);

    const { data: allAccounts } = await supabase
      .from("loyalty_accounts")
      .select("created_at")
      .eq("merchant_customer_id", customerId)
      .order("created_at", { ascending: true });

    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < growthRange; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (growthRange - 1 - i));
      dailyCounts[date.toISOString().split("T")[0]] = 0;
    }

    (allAccounts || []).forEach((acc: any) => {
      if (acc.created_at) {
        const dateStr = acc.created_at.split("T")[0];
        if (dailyCounts.hasOwnProperty(dateStr)) {
          dailyCounts[dateStr]++;
        }
      }
    });

    let cumulative = 0;
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - growthRange);
    (allAccounts || []).forEach((acc: any) => {
      if (acc.created_at && new Date(acc.created_at) < rangeStart) cumulative++;
    });

    setGrowthData(Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        cumulative += count;
        return {
          date: new Date(date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
          total: cumulative
        };
      }));
  };

  const loadGenderData = async (customerId: string) => {
    const { data: loyaltyAccounts } = await supabase
      .from("loyalty_accounts")
      .select("user_id")
      .eq("merchant_customer_id", customerId);

    if (!loyaltyAccounts || loyaltyAccounts.length === 0) {
      setGenderData([
        { gender: "Männlich", count: 0, percentage: 0 },
        { gender: "Weiblich", count: 0, percentage: 0 }
      ]);
      return;
    }

    const userIds = loyaltyAccounts.map(acc => acc.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("gender")
      .in("user_id", userIds);

    let male = 0, female = 0;
    (profiles || []).forEach((p: any) => {
      if (p.gender === "männlich" || p.gender === "male") male++;
      else if (p.gender === "weiblich" || p.gender === "female") female++;
    });

    const total = male + female;
    setGenderData([
      { gender: "Männlich", count: male, percentage: total > 0 ? Math.round((male / total) * 100) : 0 },
      { gender: "Weiblich", count: female, percentage: total > 0 ? Math.round((female / total) * 100) : 0 }
    ]);
  };

  const loadAgeData = async (customerId: string) => {
    const { data: loyaltyAccounts } = await supabase
      .from("loyalty_accounts")
      .select("user_id")
      .eq("merchant_customer_id", customerId);

    const ageBrackets = [
      { label: "14-17", min: 14, max: 17 },
      { label: "18-24", min: 18, max: 24 },
      { label: "25-34", min: 25, max: 34 },
      { label: "35-44", min: 35, max: 44 },
      { label: "45-54", min: 45, max: 54 },
      { label: "55-64", min: 55, max: 64 },
      { label: "65+", min: 65, max: 150 }
    ];

    const ageCounts: Record<string, number> = {};
    ageBrackets.forEach(b => ageCounts[b.label] = 0);

    if (loyaltyAccounts && loyaltyAccounts.length > 0) {
      const userIds = loyaltyAccounts.map(acc => acc.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("birth_date")
        .in("user_id", userIds);

      (profiles || []).forEach((profile: any) => {
        if (profile.birth_date) {
          const age = Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          const bracket = ageBrackets.find(b => age >= b.min && age <= b.max);
          if (bracket) ageCounts[bracket.label]++;
        }
      });
    }

    setAgeData(ageBrackets.map(b => ({ age: b.label, count: ageCounts[b.label] || 0 })));
  };

  const loadCustomerSegments = async (customerId: string) => {
    const { data: loyaltyAccounts } = await supabase
      .from("loyalty_accounts")
      .select("user_id")
      .eq("merchant_customer_id", customerId);

    if (!loyaltyAccounts || loyaltyAccounts.length === 0) {
      setSegments([
        { name: "Neubesucher", count: 0, percentage: 0, color: "hsl(142, 76%, 36%)" },
        { name: "Selten", count: 0, percentage: 0, color: "hsl(48, 96%, 53%)" },
        { name: "Treu", count: 0, percentage: 0, color: "hsl(262, 83%, 58%)" },
        { name: "VIP", count: 0, percentage: 0, color: "hsl(0, 84%, 60%)" }
      ]);
      return;
    }

    // Count transactions per user
    const userTransactionCounts: Record<string, number> = {};
    for (const acc of loyaltyAccounts) {
      const { count } = await supabase
        .from("point_transactions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .eq("loyalty_account_id", acc.user_id)
        .gt("points_change", 0);
      userTransactionCounts[acc.user_id] = count || 0;
    }

    // Segment: Neu (1), Selten (2-5), Treu (6-15), VIP (16+)
    let neu = 0, selten = 0, treu = 0, vip = 0;
    Object.values(userTransactionCounts).forEach(count => {
      if (count <= 1) neu++;
      else if (count <= 5) selten++;
      else if (count <= 15) treu++;
      else vip++;
    });

    const total = loyaltyAccounts.length;
    setSegments([
      { name: "Neubesucher", count: neu, percentage: total > 0 ? Math.round((neu / total) * 100) : 0, color: "hsl(142, 76%, 36%)" },
      { name: "Selten", count: selten, percentage: total > 0 ? Math.round((selten / total) * 100) : 0, color: "hsl(48, 96%, 53%)" },
      { name: "Treu", count: treu, percentage: total > 0 ? Math.round((treu / total) * 100) : 0, color: "hsl(262, 83%, 58%)" },
      { name: "VIP", count: vip, percentage: total > 0 ? Math.round((vip / total) * 100) : 0, color: "hsl(0, 84%, 60%)" }
    ]);
  };

  const loadRecentTransactions = async (customerId: string) => {
    const { data } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("merchant_customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10);

    setTransactions(data || []);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          Willkommen zurück{customer?.company_name ? `, ${customer.company_name}` : ''}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Hier ist eine Übersicht Ihrer Stempelkarten-Performance
        </p>
      </div>

      {/* Status Alerts */}
      {customer?.status === "paused" && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Pause className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">Abo pausiert</p>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Während der Pause sind Sie nicht in der Endkunden-App sichtbar.
              </p>
            </div>
          </div>
        </div>
      )}

      {subscriptionInfo?.cancelAtPeriodEnd && subscriptionInfo.cancelAt && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">Kündigung eingereicht</p>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Ihr Abonnement endet am {formatDate(subscriptionInfo.cancelAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid - 4 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalContacts || 0}</p>
                <p className="text-xs text-muted-foreground">Kontakte gesammelt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalStamps || 0}</p>
                <p className="text-xs text-muted-foreground">Stempel gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Gift className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalRedemptions || 0}</p>
                <p className="text-xs text-muted-foreground">Prämien eingelöst</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pulsCount || 0}</p>
                <p className="text-xs text-muted-foreground">Puls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Stempelzeiten & Nutzerzuwachs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stempelzeiten Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Häufigste Stempelzeiten
              </CardTitle>
              <DateRangeSelector value={hourlyRange} onChange={setHourlyRange} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`${value} Stempel`, "Anzahl"]}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorHour)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Nutzerzuwachs Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Neukontakte
              </CardTitle>
              <DateRangeSelector value={growthRange} onChange={setGrowthRange} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} interval={Math.max(1, Math.floor(growthRange / 6))} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`${value} Nutzer`, "Gesamt"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="url(#colorGrowth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demografie Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Demografie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Geschlechterverteilung */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Geschlechterverteilung</p>
              <div className="flex items-center gap-6">
                {/* Male */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="7" r="4"/>
                      <path d="M12 14c-6 0-8 3-8 6v1h16v-1c0-3-2-6-8-6z"/>
                    </svg>
                    <span className="text-sm font-medium">Männlich</span>
                  </div>
                  <div className="h-8 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${genderData[0]?.percentage || 0}%` }}
                    >
                      <span className="text-xs font-bold text-white">{genderData[0]?.percentage || 0}%</span>
                    </div>
                  </div>
                </div>
                {/* Female */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="7" r="4"/>
                      <path d="M12 14c-6 0-8 3-8 6v1h16v-1c0-3-2-6-8-6z"/>
                    </svg>
                    <span className="text-sm font-medium">Weiblich</span>
                  </div>
                  <div className="h-8 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${genderData[1]?.percentage || 0}%` }}
                    >
                      <span className="text-xs font-bold text-white">{genderData[1]?.percentage || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Altersverteilung */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Altersverteilung</p>
              <div className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ageData}>
                    <defs>
                      <linearGradient id="colorAge" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="age" tick={{ fontSize: 9 }} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                      formatter={(value: number) => [`${value} Nutzer`, "Anzahl"]}
                    />
                    <Area type="monotone" dataKey="count" stroke="hsl(262, 83%, 58%)" strokeWidth={2} fill="url(#colorAge)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kundengruppen Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Kundengruppen</CardTitle>
          <p className="text-xs text-muted-foreground">Aufteilung nach Besuchshäufigkeit</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {segments.map((segment) => (
              <div key={segment.name} className="text-center p-4 rounded-lg bg-muted/50">
                <div 
                  className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: segment.color + "20" }}
                >
                  <span className="text-lg font-bold" style={{ color: segment.color }}>{segment.percentage}%</span>
                </div>
                <p className="text-sm font-medium">{segment.name}</p>
                <p className="text-xs text-muted-foreground">{segment.count} Kontakte</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-4">
              <span>• Neubesucher: 1 Besuch</span>
              <span>• Selten: 2-5 Besuche</span>
              <span>• Treu: 6-15 Besuche</span>
              <span>• VIP: 16+ Besuche</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kennzahlen & Letzte Transaktionen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kennzahlen */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kennzahlen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm">Eloyo-Nutzer gesamt</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">{stats?.totalContacts || 0}</span>
                  {stats && stats.newContacts7Days > 0 && (
                    <span className="text-xs text-green-600 ml-2">+{stats.newContacts7Days} (7T)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span className="text-sm">Gesamttransaktionen</span>
                </div>
                <span className="font-bold">{(stats?.totalStamps || 0) + (stats?.totalRedemptions || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Stempel vergeben</span>
                </div>
                <span className="font-bold">{stats?.totalStamps || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-amber-600" />
                  <span className="text-sm">Prämien eingelöst</span>
                </div>
                <span className="font-bold">{stats?.totalRedemptions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Letzte Transaktionen */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Letzte Transaktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Noch keine Transaktionen</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      {tx.points_change > 0 ? (
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                          <Gift className="w-3 h-3 text-amber-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium">{tx.description || tx.transaction_type}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("de-DE", { 
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" 
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${tx.points_change > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {tx.points_change > 0 ? '+' : ''}{tx.points_change}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tipp */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Tipp</p>
              <p className="text-xs text-muted-foreground">
                Richten Sie automatisierte Nachrichten unter "Automatisierungen" ein, um Ihre Kunden aktiv zu halten.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
