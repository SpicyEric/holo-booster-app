import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, DollarSign, QrCode, Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const Stats = () => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMerchant, setSelectedMerchant] = useState<string>("all");
  const [merchants, setMerchants] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    totalScans: 0,
    newCustomers: 0,
    customerGrowth: [] as Array<{ date: string; count: number }>,
    revenue: [] as Array<{ date: string; amount: number }>,
    topSalesPersons: [] as Array<{ name: string; sales: number }>,
    totalScansData: [] as Array<{ date: string; scans: number }>,
  });

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    loadStats();
  }, [startDate, endDate, selectedMerchant]);

  const loadMerchants = async () => {
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "merchant");

      if (roles) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", roles.map(r => r.user_id));

        setMerchants(profiles?.map(p => ({ id: p.user_id, name: p.full_name || "Unbekannt" })) || []);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Vertriebspartner:", error);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Total Customers
      const { count: totalCustomersCount } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true });

      // New Customers in range
      const { count: newCustomersCount } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      // Customer Growth
      let customersQuery = supabase
        .from("customers")
        .select("created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at");

      if (selectedMerchant !== "all") {
        const { data: subscriptions } = await supabase
          .from("customer_subscriptions")
          .select("customer_id")
          .eq("created_by", selectedMerchant);
        
        const customerIds = subscriptions?.map(s => s.customer_id) || [];
        if (customerIds.length > 0) {
          customersQuery = customersQuery.in("id", customerIds);
        }
      }

      const { data: customers } = await customersQuery;

      const customersByDate = customers?.reduce((acc, customer) => {
        const date = new Date(customer.created_at).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit' });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const customerGrowth = Object.entries(customersByDate || {}).map(([date, count]) => ({
        date,
        count,
      }));

      // Revenue
      const { data: payments } = await supabase
        .from("payments")
        .select("payment_date, amount")
        .gte("payment_date", start.toISOString())
        .lte("payment_date", end.toISOString())
        .order("payment_date");

      const revenueByDate = payments?.reduce((acc, payment) => {
        const date = new Date(payment.payment_date).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit' });
        acc[date] = (acc[date] || 0) + parseFloat(payment.amount.toString());
        return acc;
      }, {} as Record<string, number>);

      const revenue = Object.entries(revenueByDate || {}).map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      }));

      const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);

      // Top Sales Persons
      let subscriptionsQuery = supabase
        .from("customer_subscriptions")
        .select("created_by, profiles(full_name)")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (selectedMerchant !== "all") {
        subscriptionsQuery = subscriptionsQuery.eq("created_by", selectedMerchant);
      }

      const { data: subscriptions } = await subscriptionsQuery;

      const salesByPerson = subscriptions?.reduce((acc, sub) => {
        const name = (sub.profiles as any)?.full_name || "Unbekannt";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topSalesPersons = Object.entries(salesByPerson || {})
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      // Total Scans
      const { data: scans, count: totalScansCount } = await supabase
        .from("scans")
        .select("created_at", { count: "exact" })
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at");

      const scansByDate = scans?.reduce((acc, scan) => {
        const date = new Date(scan.created_at).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit' });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalScansData = Object.entries(scansByDate || {}).map(([date, scans]) => ({
        date,
        scans,
      }));

      setStats({
        totalCustomers: totalCustomersCount || 0,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalScans: totalScansCount || 0,
        newCustomers: newCustomersCount || 0,
        customerGrowth,
        revenue,
        topSalesPersons,
        totalScansData,
      });
    } catch (error) {
      console.error("Fehler beim Laden der Statistiken:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Statistiken</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detaillierte Analysen und Auswertungen
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-xs">Von</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-xs">Bis</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant" className="text-xs">Vertriebspartner</Label>
            <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {merchants.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full bg-gradient-primary animate-pulse-glow" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Kunden gesamt</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              <p className="text-xs text-muted-foreground mt-1">+{stats.newCustomers} neu</p>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Umsatz</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground mt-1">im Zeitraum</p>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <QrCode className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Scans gesamt</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalScans}</p>
              <p className="text-xs text-muted-foreground mt-1">im Zeitraum</p>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Verkäufer</p>
              </div>
              <p className="text-2xl font-bold">{stats.topSalesPersons.length}</p>
              <p className="text-xs text-muted-foreground mt-1">aktiv</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Customer Growth */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Kundenzuwachs</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="count" stroke="#8B5CF6" name="Neue Kunden" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Revenue */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Umsatzentwicklung</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.revenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="amount" fill="#3B82F6" name="Umsatz (€)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Top Sales Persons */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Top Verkäufer</h3>
              </div>
              <div className="space-y-2">
                {stats.topSalesPersons.length > 0 ? (
                  stats.topSalesPersons.map((person, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="truncate">{person.name}</span>
                      <span className="font-bold text-primary">{person.sales}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Keine Daten verfügbar</p>
                )}
              </div>
            </Card>

            {/* Scans */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Scan-Verlauf</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.totalScansData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="scans" stroke="#10B981" name="Scans" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Stats;