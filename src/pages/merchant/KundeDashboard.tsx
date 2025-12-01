import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Users, Trophy, Gift, Clock, Star, TrendingUp,
  AlertTriangle, Pause, Target, QrCode
} from "lucide-react";

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
  totalContacts: number;
  totalScans: number;
  totalStamps: number;
  optInContacts: number;
  peakHour: string;
  newContacts7Days: number;
}

export default function KundeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

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

      // 1. Load customer data from Lovable Cloud
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

      // 2. Load subscription info
      try {
        const { data: subInfo, error: subError } = await supabase.functions.invoke("get-subscription-info");
        if (!subError && subInfo) {
          setSubscriptionInfo(subInfo);
        }
      } catch (e) {
        // Subscription info not available - that's ok
      }

      // 3. Load dashboard stats from Lovable Cloud
      if (customerData?.id) {
        await loadDashboardStats(customerData.id);
      } else {
        setStats({
          totalContacts: 0,
          totalScans: 0,
          totalStamps: 0,
          optInContacts: 0,
          peakHour: "—",
          newContacts7Days: 0,
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (customerId: string) => {
    try {
      // Load contacts count
      const { count: totalContacts } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .is("deleted_at", null);

      // Load opt-in contacts count
      const { count: optInContacts } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .eq("opt_in", true)
        .is("deleted_at", null);

      // Load scans count
      const { count: totalScans } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId);

      // Load stamps count
      const { count: totalStamps } = await supabase
        .from("stamps")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId);

      // Load scans for peak hour analysis
      const { data: scans } = await supabase
        .from("scans")
        .select("created_at")
        .eq("customer_id", customerId);

      const hourCounts: Record<number, number> = {};
      (scans || []).forEach((scan) => {
        if (scan.created_at) {
          const hour = new Date(scan.created_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });

      // Find peak hour
      let peakHour = "—";
      let maxCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count;
          peakHour = `${hour}:00 - ${parseInt(hour) + 1}:00 Uhr`;
        }
      });

      // Count new contacts in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: newContacts7Days } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .is("deleted_at", null);

      setStats({
        totalContacts: totalContacts || 0,
        totalScans: totalScans || 0,
        totalStamps: totalStamps || 0,
        optInContacts: optInContacts || 0,
        peakHour,
        newContacts7Days: newContacts7Days || 0,
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      setStats({
        totalContacts: 0,
        totalScans: 0,
        totalStamps: 0,
        optInContacts: 0,
        peakHour: "—",
        newContacts7Days: 0,
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

  const calculateOptInRatio = () => {
    if (!stats || stats.totalContacts === 0) return "0%";
    const ratio = (stats.optInContacts / stats.totalContacts) * 100;
    return `${ratio.toFixed(1)}%`;
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

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Kontakte */}
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

        {/* QR-Scans */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <QrCode className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalScans || 0}</p>
                <p className="text-xs text-muted-foreground">QR-Scans gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stempel */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalStamps || 0}</p>
                <p className="text-xs text-muted-foreground">Stempel vergeben</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opt-In Rate */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.optInContacts || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Opt-In ({calculateOptInRatio()})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Peak Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Primetime
            </CardTitle>
            <CardDescription className="text-xs">
              Häufigste Scan-Zeit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.peakHour || "—"}</p>
          </CardContent>
        </Card>

        {/* New Contacts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Neukontakte (7 Tage)
            </CardTitle>
            <CardDescription className="text-xs">
              Neue Kontakte diese Woche
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{stats?.newContacts7Days || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Hint */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Tipp</p>
              <p className="text-xs text-muted-foreground">
                Richten Sie Ihre Stempelkarte unter "Stempelkarte" ein, um in der Eloyo-App sichtbar zu werden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
