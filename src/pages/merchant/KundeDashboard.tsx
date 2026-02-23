import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Users, Trophy, Gift, Clock, TrendingUp,
  AlertTriangle, Pause, Zap
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, BarChart, Bar
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
  networkEffect: number;
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
  label: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
}

interface Transaction {
  id: string;
  created_at: string;
  points_change: number;
  transaction_type: string | null;
  description: string | null;
}

type DateRange = 7 | 14 | 30 | 90;

// Demo-Daten für "Frise Gut Klaus" (ID: e8e3db26-fd15-455a-ad47-50ed25081e3c)
const DEMO_MERCHANT_ID = "e8e3db26-fd15-455a-ad47-50ed25081e3c";

const DEMO_STATS: DashboardStats = {
  totalContacts: 2400,
  totalStamps: 93000,
  totalRedemptions: 800,
  networkEffect: 600,
  newContacts7Days: 47
};

const generateDemoHourlyData = (): HourlyData[] => {
  // Realistische Verteilung für einen Friseur (Peaks: 10-12 Uhr und 14-18 Uhr)
  const hourlyPattern = [
    2, 3, 1, 0, 0, 0, 8, 45, 120, 280, 350, 380, // 0-11 Uhr
    320, 290, 340, 410, 450, 420, 280, 150, 80, 35, 15, 5 // 12-23 Uhr
  ];
  return hourlyPattern.map((count, hour) => ({
    hour: `${hour}:00`,
    count
  }));
};

const generateDemoGrowthData = (days: number): GrowthData[] => {
  const data: GrowthData[] = [];
  let baseTotal = 2400 - Math.floor(days * 6.5); // Rückrechnung basierend auf ~47/Woche
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dailyGrowth = Math.floor(4 + Math.random() * 8); // 4-12 neue Kontakte pro Tag
    baseTotal += dailyGrowth;
    data.push({
      date: date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      total: baseTotal
    });
  }
  return data;
};

const DEMO_GENDER_DATA: GenderData[] = [
  { gender: "Männlich", count: 1560, percentage: 65 },
  { gender: "Weiblich", count: 840, percentage: 35 }
];

const DEMO_AGE_DATA: AgeData[] = [
  { age: "14-17", count: 96 },
  { age: "18-24", count: 384 },
  { age: "25-34", count: 720 },
  { age: "35-44", count: 576 },
  { age: "45-54", count: 384 },
  { age: "55-64", count: 168 },
  { age: "65+", count: 72 }
];

const DEMO_SEGMENTS: CustomerSegment[] = [
  { name: "Neu", label: "1 Besuch", count: 480, percentage: 20, color: "#22C55E", bgColor: "bg-green-100" },
  { name: "Selten", label: "5+ Besuche", count: 720, percentage: 30, color: "#A855F7", bgColor: "bg-purple-100" },
  { name: "Treu", label: "15+ Besuche", count: 840, percentage: 35, color: "#3B82F6", bgColor: "bg-blue-100" },
  { name: "VIP", label: "25+ Besuche", count: 360, percentage: 15, color: "#F97316", bgColor: "bg-orange-100" }
];

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: "1", created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), points_change: 10, transaction_type: "nfc_stamp", description: "NFC Stempel: grün" },
  { id: "2", created_at: new Date(Date.now() - 1000 * 60 * 23).toISOString(), points_change: 20, transaction_type: "nfc_stamp", description: "NFC Stempel: blau" },
  { id: "3", created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), points_change: -50, transaction_type: "redemption", description: "Prämie eingelöst: Gratis Haarschnitt" },
  { id: "4", created_at: new Date(Date.now() - 1000 * 60 * 67).toISOString(), points_change: 10, transaction_type: "nfc_stamp", description: "NFC Stempel: grün" },
  { id: "5", created_at: new Date(Date.now() - 1000 * 60 * 89).toISOString(), points_change: 30, transaction_type: "nfc_stamp", description: "NFC Stempel: rot" },
  { id: "6", created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), points_change: 10, transaction_type: "nfc_stamp", description: "NFC Stempel: grün" },
  { id: "7", created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), points_change: -100, transaction_type: "redemption", description: "Prämie eingelöst: Gratis Bartpflege" },
  { id: "8", created_at: new Date(Date.now() - 1000 * 60 * 210).toISOString(), points_change: 20, transaction_type: "nfc_stamp", description: "NFC Stempel: blau" },
  { id: "9", created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(), points_change: 10, transaction_type: "nfc_stamp", description: "NFC Stempel: grün" },
  { id: "10", created_at: new Date(Date.now() - 1000 * 60 * 280).toISOString(), points_change: 5, transaction_type: "google_review", description: "Google Bewertung Bonus" }
];

const DateRangeSelector = ({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) => (
  <div className="flex gap-1">
    {([7, 14, 30, 90] as DateRange[]).map((days) => (
      <button
        key={days}
        className={`px-3 py-1 text-xs rounded-full transition-all ${
          value === days 
            ? 'bg-primary text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        onClick={() => onChange(days)}
      >
        {days}T
      </button>
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
  
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
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
      if (customer.id === DEMO_MERCHANT_ID) {
        setHourlyData(generateDemoHourlyData());
      } else {
        loadHourlyData(customer.id);
      }
    }
  }, [customer?.id, hourlyRange]);

  useEffect(() => {
    if (customer?.id) {
      if (customer.id === DEMO_MERCHANT_ID) {
        setGrowthData(generateDemoGrowthData(growthRange));
      } else {
        loadGrowthData(customer.id);
      }
    }
  }, [customer?.id, growthRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      let customerData = null;
      if (user?.id) {
        customerData = await getUserCustomer(user.id);
        if (customerData) {
          // Check if merchant needs onboarding (no Box-ID linked)
          const { count: boxCount } = await supabase
            .from("customer_boxes")
            .select("id", { count: "exact", head: true })
            .eq("customer_id", customerData.id);

          if (!boxCount || boxCount === 0) {
            navigate("/kunde/setup");
            return;
          }

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

      try {
        const { data: subInfo } = await supabase.functions.invoke("get-subscription-info");
        if (subInfo) setSubscriptionInfo(subInfo);
      } catch (e) {}

      if (customerData?.id) {
        // Check if this is the demo merchant
        if (customerData.id === DEMO_MERCHANT_ID) {
          // Use demo data
          setStats(DEMO_STATS);
          setHourlyData(generateDemoHourlyData());
          setGrowthData(generateDemoGrowthData(growthRange));
          setGenderData(DEMO_GENDER_DATA);
          setAgeData(DEMO_AGE_DATA);
          setSegments(DEMO_SEGMENTS);
          setTransactions(DEMO_TRANSACTIONS);
        } else {
          // Load real data for other merchants
          await Promise.all([
            loadDashboardStats(customerData.id),
            loadHourlyData(customerData.id),
            loadGrowthData(customerData.id),
            loadGenderData(customerData.id),
            loadAgeData(customerData.id),
            loadCustomerSegments(customerData.id),
            loadRecentTransactions(customerData.id)
          ]);
        }
      } else {
        setStats({ totalContacts: 0, totalStamps: 0, totalRedemptions: 0, networkEffect: 0, newContacts7Days: 0 });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (customerId: string) => {
    try {
      const { count: totalContacts } = await supabase
        .from("loyalty_accounts")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId);

      // Count stamp transactions (nfc_stamp type)
      const { count: totalStamps } = await supabase
        .from("point_transactions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .eq("transaction_type", "nfc_stamp");

      // Count reward redemptions + offer redemptions
      const { count: rewardRedemptions } = await supabase
        .from("reward_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId);

      const { count: offerRedemptions } = await supabase
        .from("point_transactions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .eq("transaction_type", "offer_redeemed");

      const totalRedemptions = (rewardRedemptions || 0) + (offerRedemptions || 0);

      // Network Effect: Count redeemed new customer offers (Neukundenaktionen)
      const { count: networkEffect } = await supabase
        .from("point_transactions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .eq("transaction_type", "new_customer_bonus");

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
        networkEffect,
        newContacts7Days: newContacts7Days || 0
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({ totalContacts: 0, totalStamps: 0, totalRedemptions: 0, networkEffect: 0, newContacts7Days: 0 });
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
      .select("id, user_id")
      .eq("merchant_customer_id", customerId);

    if (!loyaltyAccounts || loyaltyAccounts.length === 0) {
      setSegments([
        { name: "Neu", label: "1 Besuch", count: 0, percentage: 0, color: "#22C55E", bgColor: "bg-green-100" },
        { name: "Selten", label: "5+ Besuche", count: 0, percentage: 0, color: "#A855F7", bgColor: "bg-purple-100" },
        { name: "Treu", label: "15+ Besuche", count: 0, percentage: 0, color: "#3B82F6", bgColor: "bg-blue-100" },
        { name: "VIP", label: "25+ Besuche", count: 0, percentage: 0, color: "#F97316", bgColor: "bg-orange-100" }
      ]);
      return;
    }

    const userTransactionCounts: Record<string, number> = {};
    for (const acc of loyaltyAccounts) {
      const { count } = await supabase
        .from("point_transactions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_customer_id", customerId)
        .eq("loyalty_account_id", acc.id)
        .gt("points_change", 0);
      userTransactionCounts[acc.id] = count || 0;
    }

    let neu = 0, selten = 0, treu = 0, vip = 0;
    Object.values(userTransactionCounts).forEach(count => {
      if (count <= 1) neu++;
      else if (count <= 5) selten++;
      else if (count <= 15) treu++;
      else vip++;
    });

    const total = loyaltyAccounts.length;
    setSegments([
      { name: "Neu", label: "1 Besuch", count: neu, percentage: total > 0 ? Math.round((neu / total) * 100) : 0, color: "#22C55E", bgColor: "bg-green-100" },
      { name: "Selten", label: "5+ Besuche", count: selten, percentage: total > 0 ? Math.round((selten / total) * 100) : 0, color: "#A855F7", bgColor: "bg-purple-100" },
      { name: "Treu", label: "15+ Besuche", count: treu, percentage: total > 0 ? Math.round((treu / total) * 100) : 0, color: "#3B82F6", bgColor: "bg-blue-100" },
      { name: "VIP", label: "25+ Besuche", count: vip, percentage: total > 0 ? Math.round((vip / total) * 100) : 0, color: "#F97316", bgColor: "bg-orange-100" }
    ]);
  };

  const loadRecentTransactions = async (customerId: string) => {
    const { data } = await supabase
      .from("point_transactions")
      .select("id, created_at, points_change, transaction_type, description")
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
      <div className="flex items-center justify-center min-h-[60vh] bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Willkommen zurück{customer?.company_name ? `, ${customer.company_name}` : ''}!
          </h1>
          <p className="text-gray-500 mt-1">
            Hier ist deine Übersicht
          </p>
        </div>

        {/* Status Alerts */}
        {customer?.status === "paused" && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <Pause className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Abo pausiert</p>
                <p className="text-sm text-amber-700">
                  Während der Pause bist du nicht in der Endkunden-App sichtbar.
                </p>
              </div>
            </div>
          </div>
        )}

        {subscriptionInfo?.cancelAtPeriodEnd && subscriptionInfo.cancelAt && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Kündigung eingereicht</p>
                <p className="text-sm text-amber-700">
                  Dein Abonnement endet am {formatDate(subscriptionInfo.cancelAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Stats - Mankido Style Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kontakte gesammelt */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalContacts?.toLocaleString('de-DE') || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Kontakte gesammelt</p>
          </div>

          {/* Stempel gesamt */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalStamps?.toLocaleString('de-DE') || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Stempel gesamt</p>
          </div>

          {/* Prämien eingelöst */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalRedemptions?.toLocaleString('de-DE') || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Prämien eingelöst</p>
          </div>

          {/* Netzwerk-Effekt */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.networkEffect?.toLocaleString('de-DE') || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Netzwerk-Effekt</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stempelzeiten Chart */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Häufigste Stempelzeiten</h3>
              </div>
              <DateRangeSelector value={hourlyRange} onChange={setHourlyRange} />
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}
                    formatter={(value: number) => [`${value} Stempel`, "Anzahl"]}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fill="url(#colorHour)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Nutzerzuwachs Chart */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Nutzerzuwachs</h3>
              </div>
              <DateRangeSelector value={growthRange} onChange={setGrowthRange} />
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(growthRange / 6))} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}
                    formatter={(value: number) => [`${value} Nutzer`, "Gesamt"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="#22C55E" strokeWidth={2} fill="url(#colorGrowth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Kundengruppen - Mankido Style */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-6">Kundengruppen</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {segments.map((segment) => (
              <div key={segment.name} className="bg-white rounded-xl p-5 border border-gray-100 text-center">
                <div 
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: segment.color + '20' }}
                >
                  <span className="text-sm font-bold" style={{ color: segment.color }}>{segment.name}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{segment.label}</p>
                <p className="text-3xl font-bold text-gray-900">{segment.percentage}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Demografie Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Geschlecht */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-6">Nach Geschlecht</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                {/* Donut chart visual */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="3"
                    strokeDasharray={`${genderData[1]?.percentage || 0}, 100`}
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray={`${genderData[0]?.percentage || 0}, 100`}
                    strokeDashoffset={`-${genderData[1]?.percentage || 0}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm text-gray-500">Männlich</span>
                  <span className="text-2xl font-bold text-gray-900">{genderData[0]?.percentage || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alter */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-6">Nach Alter</h3>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}
                    formatter={(value: number) => [`${value} Nutzer`, "Anzahl"]}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Removed: Kennzahlen & Letzte Transaktionen – see /kunde/transaktionen */}
      </div>
    </div>
  );
}
