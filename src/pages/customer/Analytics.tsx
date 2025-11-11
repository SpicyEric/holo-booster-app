import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, DollarSign, Repeat } from "lucide-react";
import { CustomerHeader } from "@/components/CustomerHeader";
import Particles from "@/components/Particles";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ScanData {
  date: string;
  scans: number;
}

interface ContactData {
  date: string;
  contacts: number;
}

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanData, setScanData] = useState<ScanData[]>([]);
  const [contactData, setContactData] = useState<ContactData[]>([]);
  const [stats, setStats] = useState({
    estimatedRevenue: 0,
    returningVisitors: 0,
    totalScans: 0,
    totalContacts: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Get customer linked to this user
      const { data: customerUser } = await supabase
        .from("customer_users")
        .select("customer_id")
        .eq("user_id", user?.id)
        .single();

      if (!customerUser) return;

      const customerId = customerUser.customer_id;

      // Get last 7 days data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get scans per day for last 7 days
      const { data: scansData } = await supabase
        .from("scans")
        .select("created_at")
        .eq("customer_id", customerId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Process scan data by day
      const scansByDay: { [key: string]: number } = {};
      scansData?.forEach((scan) => {
        const date = new Date(scan.created_at).toLocaleDateString("de-DE");
        scansByDay[date] = (scansByDay[date] || 0) + 1;
      });

      const scanChartData: ScanData[] = Object.entries(scansByDay).map(([date, scans]) => ({
        date,
        scans,
      }));

      setScanData(scanChartData);

      // Get contacts per day for last 7 days
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("created_at")
        .eq("customer_id", customerId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      // Process contact data by day
      const contactsByDay: { [key: string]: number } = {};
      contactsData?.forEach((contact) => {
        const date = new Date(contact.created_at).toLocaleDateString("de-DE");
        contactsByDay[date] = (contactsByDay[date] || 0) + 1;
      });

      const contactChartData: ContactData[] = Object.entries(contactsByDay).map(([date, contacts]) => ({
        date,
        contacts,
      }));

      setContactData(contactChartData);

      // Calculate returning visitors (contacts who scanned multiple times)
      const { data: allScans } = await supabase
        .from("scans")
        .select("contact_id")
        .eq("customer_id", customerId)
        .not("contact_id", "is", null);

      const contactIds = allScans?.map((s) => s.contact_id) || [];
      const uniqueContacts = new Set(contactIds);
      const returningCount = contactIds.length - uniqueContacts.size;

      // Estimated revenue: Assume each contact leads to €15 average revenue
      const totalContacts = contactsData?.length || 0;
      const estimatedRevenue = totalContacts * 15;

      setStats({
        estimatedRevenue,
        returningVisitors: returningCount,
        totalScans: scansData?.length || 0,
        totalContacts,
      });
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Particles
        particleColors={["#8B5CF6", "#3B82F6", "#8B5CF6"]}
        particleCount={100}
        particleSpread={8}
        speed={0.05}
        particleBaseSize={100}
        sizeRandomness={1.5}
        moveParticlesOnHover={true}
        alphaParticles={true}
        disableRotation={false}
        cameraDistance={20}
      />

      <CustomerHeader />

      <main className="container mx-auto px-4 py-8 space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Letzte 7 Tage im Überblick</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QR-Scans</CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalScans}</div>
              <p className="text-xs text-muted-foreground mt-1">Letzte 7 Tage</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Neue Kontakte</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalContacts}</div>
              <p className="text-xs text-muted-foreground mt-1">Letzte 7 Tage</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geschätzter Mehrumsatz</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(stats.estimatedRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Basierend auf ø €15/Kontakt</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wiederkehrende Besucher</CardTitle>
              <Repeat className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.returningVisitors}</div>
              <p className="text-xs text-muted-foreground mt-1">Mehrfache Scans</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scans Chart */}
          <Card>
            <CardHeader>
              <CardTitle>QR-Code-Scans (7 Tage)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={scanData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="scans"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Scans"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Contacts Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Handynummern-Verlauf (7 Tage)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={contactData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="contacts" fill="hsl(var(--primary))" name="Neue Kontakte" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">📊 Über Ihre Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>QR-Scans:</strong> Anzahl der Scans Ihrer QR-Codes in den letzten 7 Tagen
            </p>
            <p>
              <strong>Neue Kontakte:</strong> Anzahl der neu hinterlegten Handynummern
            </p>
            <p>
              <strong>Geschätzter Mehrumsatz:</strong> Basierend auf durchschnittlich €15 Umsatz pro
              gewonnenem Kontakt
            </p>
            <p>
              <strong>Wiederkehrende Besucher:</strong> Kunden, die Ihren QR-Code mehrfach gescannt haben
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
