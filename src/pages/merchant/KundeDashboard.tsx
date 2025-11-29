import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { appSupabase } from "@/integrations/app-supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, Users, Trophy, Gift, Clock, Star, TrendingUp,
  AlertTriangle, Pause, UserCheck, Target
} from "lucide-react";
import { DashboardCharts } from "@/components/merchant/DashboardCharts";

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
  plan?: {
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

interface DashboardStats {
  totalLoyaltyUsers: number;
  totalPointsGiven: number;
  totalPointsRedeemed: number;
  totalRewardsRedeemed: number;
  peakHour: string;
  genderRatio: { male: number; female: number; other: number };
  topAgeGroup: string;
  newCustomers7Days: number;
  googleReviewClicks: number;
}

export default function KundeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);

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

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Load customer data from Lovable Cloud (B2B data)
      if (user?.id) {
        const customerData = await getUserCustomer(user.id);
        if (customerData) {
          setCustomer({
            id: customerData.id,
            name: customerData.name,
            email: customerData.email || user.email || "",
            company_name: customerData.company_name,
            status: customerData.status || "active",
            customer_number: customerData.customer_number
          });
        } else {
          // Fallback: Create basic customer object from auth user
          setCustomer({
            id: user.id,
            name: user.email || "Kunde",
            email: user.email || "",
            company_name: null,
            status: "active",
            customer_number: null
          });
        }
      }

      // 2. Try to find merchant in App-DB by email
      // Note: This requires the merchant to have the same email in App-DB
      if (user?.email) {
        await loadMerchantByEmail(user.email);
      }

      // 3. Load subscription info from Lovable Cloud
      try {
        const { data: subInfo, error: subError } = await supabase.functions.invoke("get-subscription-info");
        if (!subError && subInfo) {
          setSubscriptionInfo(subInfo);
        }
      } catch (e) {
        // Subscription info not available - that's ok
      }

      // 4. Load dashboard stats from App database
      await loadDashboardStats();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMerchantByEmail = async (email: string) => {
    try {
      // First, try to find the user in App-DB by searching for a profile with matching email
      // Since App-DB doesn't have direct email access, we need to find the merchant differently
      
      // Option 1: Check if there's a merchant with a profile that could be linked
      // For now, we'll try to find merchant by owner_user_id if the user has registered in both systems
      
      // Alternative approach: Search for auth user in App-DB with same email via Edge Function
      const { data: appUserData, error: appUserError } = await appSupabase.functions.invoke('findUserByEmail', {
        body: { email }
      });

      if (appUserError) {
        console.log('[loadMerchantByEmail] Edge function not available, will use fallback');
        return;
      }

      if (appUserData?.userId) {
        // Found a user in App-DB with same email, now find their merchant
        const { data: merchantData } = await appSupabase
          .from("merchants")
          .select("*")
          .eq("owner_user_id", appUserData.userId)
          .maybeSingle() as { data: any };

        if (merchantData) {
          setMerchantId(merchantData.id);
          // Update customer with merchant info
          setCustomer(prev => prev ? {
            ...prev,
            company_name: merchantData.name || prev.company_name
          } : prev);
        }
      }
    } catch (error) {
      console.error('[loadMerchantByEmail] Error:', error);
      // Silently fail - user might not have a merchant in App-DB yet
    }
  };

  const loadDashboardStats = async () => {
    try {
      // If no merchantId found, show empty stats
      if (!merchantId) {
        setStats({
          totalLoyaltyUsers: 0,
          totalPointsGiven: 0,
          totalPointsRedeemed: 0,
          totalRewardsRedeemed: 0,
          peakHour: "—",
          genderRatio: { male: 0, female: 0, other: 0 },
          topAgeGroup: "—",
          newCustomers7Days: 0,
          googleReviewClicks: 0,
        });
        return;
      }

      const currentMerchantId = merchantId;

      // Load loyalty accounts count
      const { count: loyaltyUsersCount } = await appSupabase
        .from("loyalty_accounts")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", currentMerchantId);

      // Load transactions for points data
      const { data: transactions } = await appSupabase
        .from("transactions")
        .select("points_change, created_at")
        .eq("merchant_id", currentMerchantId);

      let totalPointsGiven = 0;
      let totalPointsRedeemed = 0;
      const hourCounts: Record<number, number> = {};

      (transactions || []).forEach((tx) => {
        if (tx.points_change > 0) {
          totalPointsGiven += tx.points_change;
        } else {
          totalPointsRedeemed += Math.abs(tx.points_change);
        }

        // Track hour for peak analysis
        if (tx.created_at) {
          const hour = new Date(tx.created_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });

      // Load reward redemptions count
      const { count: rewardsCount } = await appSupabase
        .from("reward_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", currentMerchantId);

      // Find peak hour
      let peakHour = "—";
      let maxCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count;
          peakHour = `${hour}:00 - ${parseInt(hour) + 1}:00 Uhr`;
        }
      });

      // Load user demographics from loyalty accounts
      const { data: loyaltyAccounts } = await appSupabase
        .from("loyalty_accounts")
        .select("user_id, created_at")
        .eq("merchant_id", currentMerchantId);

      // Count new customers in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const newCustomers7Days = (loyaltyAccounts || []).filter(
        (acc) => new Date(acc.created_at) >= sevenDaysAgo
      ).length;

      // Get user profiles for gender/age data
      const userIds = (loyaltyAccounts || []).map((acc: any) => acc.user_id);
      let genderRatio = { male: 0, female: 0, other: 0 };
      let ageGroups: Record<string, number> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await appSupabase
          .from("profiles")
          .select("gender, birth_date")
          .in("id", userIds);

        (profiles || []).forEach((profile) => {
          // Gender
          if (profile.gender === "male") genderRatio.male++;
          else if (profile.gender === "female") genderRatio.female++;
          else genderRatio.other++;

          // Age groups
          if (profile.birth_date) {
            const age = Math.floor(
              (Date.now() - new Date(profile.birth_date).getTime()) / 
              (365.25 * 24 * 60 * 60 * 1000)
            );
            let ageGroup = "Unbekannt";
            if (age < 18) ageGroup = "Unter 18";
            else if (age < 25) ageGroup = "18-24";
            else if (age < 35) ageGroup = "25-34";
            else if (age < 45) ageGroup = "35-44";
            else if (age < 55) ageGroup = "45-54";
            else ageGroup = "55+";
            ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
          }
        });
      }

      // Find top age group
      let topAgeGroup = "—";
      let maxAgeCount = 0;
      Object.entries(ageGroups).forEach(([group, count]) => {
        if (count > maxAgeCount) {
          maxAgeCount = count;
          topAgeGroup = group;
        }
      });

      setStats({
        totalLoyaltyUsers: loyaltyUsersCount || 0,
        totalPointsGiven,
        totalPointsRedeemed,
        totalRewardsRedeemed: rewardsCount || 0,
        peakHour,
        genderRatio,
        topAgeGroup,
        newCustomers7Days,
        googleReviewClicks: 0,
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      setStats({
        totalLoyaltyUsers: 0,
        totalPointsGiven: 0,
        totalPointsRedeemed: 0,
        totalRewardsRedeemed: 0,
        peakHour: "—",
        genderRatio: { male: 0, female: 0, other: 0 },
        topAgeGroup: "—",
        newCustomers7Days: 0,
        googleReviewClicks: 0,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Aktiv</Badge>;
      case "paused":
        return <Badge variant="secondary" className="bg-amber-500 text-white">Pausiert</Badge>;
      case "past_due":
        return <Badge variant="destructive">Überfällig</Badge>;
      case "canceled":
        return <Badge variant="secondary">Gekündigt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculatePointsRatio = () => {
    if (!stats || stats.totalPointsGiven === 0) return "0%";
    const ratio = (stats.totalPointsRedeemed / stats.totalPointsGiven) * 100;
    return `${ratio.toFixed(1)}%`;
  };

  const calculateGenderPercentage = (count: number) => {
    if (!stats) return 0;
    const total = stats.genderRatio.male + stats.genderRatio.female + stats.genderRatio.other;
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
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
          Hier ist eine Übersicht Ihrer Bonuskarten-Performance
        </p>
      </div>

      {/* Status Alerts */}
      {customer?.status === "paused" && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Pause className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
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
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">Kündigung eingereicht</p>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Ihr Abonnement endet am {formatDate(subscriptionInfo.cancelAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Merchant Warning */}
      {!merchantId && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">Händlerprofil noch nicht verknüpft</p>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Bonuskarten-Statistiken werden verfügbar, sobald Ihr Händlerprofil in der App eingerichtet ist.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Bonuskartenbenutzer */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalLoyaltyUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Bonuskarten-Nutzer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vergebene Punkte */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalPointsGiven || 0}</p>
                <p className="text-xs text-muted-foreground">Punkte vergeben</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eingelöste Punkte */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalPointsRedeemed || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Eingelöst ({calculatePointsRatio()})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prämien eingelöst */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalRewardsRedeemed || 0}</p>
                <p className="text-xs text-muted-foreground">Prämien eingelöst</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Peak Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Primetime
            </CardTitle>
            <CardDescription className="text-xs">
              Häufigste Stempelzeit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.peakHour || "—"}</p>
          </CardContent>
        </Card>

        {/* Gender Ratio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Geschlechterverhältnis
            </CardTitle>
            <CardDescription className="text-xs">
              Ihrer Bonuskarten-Nutzer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>Männlich</span>
                  <span className="font-medium">{calculateGenderPercentage(stats?.genderRatio.male || 0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${calculateGenderPercentage(stats?.genderRatio.male || 0)}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>Weiblich</span>
                  <span className="font-medium">{calculateGenderPercentage(stats?.genderRatio.female || 0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-pink-500 rounded-full" 
                    style={{ width: `${calculateGenderPercentage(stats?.genderRatio.female || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Age Group */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Altersgruppe
            </CardTitle>
            <CardDescription className="text-xs">
              Häufigste Altersgruppe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.topAgeGroup || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* New Customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Neukunden (7 Tage)
            </CardTitle>
            <CardDescription className="text-xs">
              Neue Bonuskarten-Registrierungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.newCustomers7Days || 0}</p>
          </CardContent>
        </Card>

        {/* Google Review Clicks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4" />
              Google-Bewertungen
            </CardTitle>
            <CardDescription className="text-xs">
              Klicks auf Bewertungslink
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.googleReviewClicks || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {merchantId && <DashboardCharts merchantId={merchantId} />}
    </div>
  );
}
