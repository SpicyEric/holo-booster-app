import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, Users, DollarSign, QrCode, UserMinus } from "lucide-react";

const Stats = () => {
  const [timeRange, setTimeRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    customerGrowth: [] as Array<{ date: string; count: number }>,
    revenue: [] as Array<{ date: string; amount: number }>,
    churnRate: [] as Array<{ date: string; count: number }>,
    topSalesPersons: [] as Array<{ name: string; sales: number }>,
    totalScans: [] as Array<{ date: string; scans: number }>,
    topCustomers: [] as Array<{ name: string; scans: number }>,
  });

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Customer Growth
      const { data: customers } = await supabase
        .from("customers")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at");

      const customersByDate = customers?.reduce((acc, customer) => {
        const date = new Date(customer.created_at).toLocaleDateString("de-DE");
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
        .gte("payment_date", startDate.toISOString())
        .order("payment_date");

      const revenueByDate = payments?.reduce((acc, payment) => {
        const date = new Date(payment.payment_date).toLocaleDateString("de-DE");
        acc[date] = (acc[date] || 0) + parseFloat(payment.amount.toString());
        return acc;
      }, {} as Record<string, number>);

      const revenue = Object.entries(revenueByDate || {}).map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      }));

      // Top Sales Persons
      const { data: subscriptions } = await supabase
        .from("customer_subscriptions")
        .select("created_by, profiles(full_name)")
        .gte("created_at", startDate.toISOString());

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
      const { data: scans } = await supabase
        .from("scans")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at");

      const scansByDate = scans?.reduce((acc, scan) => {
        const date = new Date(scan.created_at).toLocaleDateString("de-DE");
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalScans = Object.entries(scansByDate || {}).map(([date, scans]) => ({
        date,
        scans,
      }));

      // Top Customers by Scans
      const { data: scansByCustomer } = await supabase
        .from("scans")
        .select("customer_id, customers(name)")
        .gte("created_at", startDate.toISOString());

      const scansPerCustomer = scansByCustomer?.reduce((acc, scan) => {
        const name = (scan.customers as any)?.name || "Unbekannt";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCustomers = Object.entries(scansPerCustomer || {})
        .map(([name, scans]) => ({ name, scans }))
        .sort((a, b) => b.scans - a.scans)
        .slice(0, 5);

      setStats({
        customerGrowth,
        revenue,
        churnRate: [],
        topSalesPersons,
        totalScans,
        topCustomers,
      });
    } catch (error) {
      console.error("Fehler beim Laden der Statistiken:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Statistiken</h1>
          <p className="text-muted-foreground mt-2">
            Detaillierte Analysen und Auswertungen
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Zeitraum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Letzte 7 Tage</SelectItem>
            <SelectItem value="30">Letzte 30 Tage</SelectItem>
            <SelectItem value="90">Letzte 90 Tage</SelectItem>
            <SelectItem value="365">Letztes Jahr</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full bg-gradient-primary animate-pulse-glow" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Customer Growth */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Kundenzuwachs</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8B5CF6" name="Neue Kunden" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Revenue */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Umsatzentwicklung</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.revenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#3B82F6" name="Umsatz (€)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Sales Persons */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Top Verkäufer</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.topSalesPersons}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, sales }) => `${name}: ${sales}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="sales"
                  >
                    {stats.topSalesPersons.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Top Customers by Scans */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Top Kunden (Scans)</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="scans" fill="#10B981" name="Scans" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Total Scans */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Scan-Verlauf</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.totalScans}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="scans" stroke="#10B981" name="Scans" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Stats;