import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, Box, MessageSquare, RefreshCw,
  TrendingUp, Activity, Stamp, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface Alert {
  type: "warning" | "error" | "info";
  message: string;
  action?: string;
  link?: string;
}

const Overview = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kpis, setKpis] = useState({
    activeCustomers: 0,
    newCustomers7d: 0,
    activityRate: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "point_transactions" }, () => {
        loadLiveFeed();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    await Promise.all([loadAlerts(), loadKPIs(), loadChart(), loadLiveFeed()]);
    setLoading(false);
  };

  const loadAlerts = async () => {
    const newAlerts: Alert[] = [];

    // Customers without stamp activity (5+ days)
    try {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const { data: activeCustomers } = await supabase
        .from("customers")
        .select("id, name")
        .eq("active", true);

      if (activeCustomers && activeCustomers.length > 0) {
        const { data: recentActivity } = await supabase
          .from("point_transactions")
          .select("merchant_customer_id")
          .eq("transaction_type", "nfc_stamp")
          .gte("created_at", fiveDaysAgo.toISOString());

        const activeIds = new Set((recentActivity || []).map((r) => r.merchant_customer_id));
        const inactive = activeCustomers.filter((c) => !activeIds.has(c.id));

        if (inactive.length > 0) {
          newAlerts.push({
            type: "warning",
            message: `${inactive.length} Kunde${inactive.length > 1 ? "n" : ""} ohne Stempelaktivität (5+ Tage)`,
            action: "Anzeigen",
            link: "/admin/customers",
          });
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Unanswered support messages
    try {
      const { count } = await supabase
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");

      if (count && count > 0) {
        newAlerts.push({
          type: "error",
          message: `${count} Support-Nachricht${count > 1 ? "en" : ""} unbeantwortet`,
          action: "Öffnen",
          link: "/admin/orders",
        });
      }
    } catch (e) {
      console.error(e);
    }

    // Low box IDs
    try {
      const { data: allBoxes } = await supabase.from("boxes").select("id");
      const { data: assignedBoxes } = await supabase.from("customer_boxes").select("box_id");
      const assignedIds = new Set((assignedBoxes || []).map((b) => b.box_id));
      const available = (allBoxes || []).filter((b) => !assignedIds.has(b.id)).length;

      if (available < 3) {
        newAlerts.push({
          type: available === 0 ? "error" : "warning",
          message: available === 0
            ? "Keine Box-IDs mehr verfügbar!"
            : `Nur noch ${available} Box-ID${available > 1 ? "s" : ""} verfügbar`,
          action: "Box-IDs verwalten",
          link: "/admin/boxes",
        });
      }
    } catch (e) {
      console.error(e);
    }

    // Unanswered contact submissions
    try {
      const { count } = await supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");

      if (count && count > 0) {
        newAlerts.push({
          type: "warning",
          message: `${count} Kontaktanfrage${count > 1 ? "n" : ""} unbeantwortet`,
          action: "Öffnen",
          link: "/admin/orders",
        });
      }
    } catch (e) {
      console.error(e);
    }

    setAlerts(newAlerts);
  };

  const loadKPIs = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [activeRes, newRes, allActiveRes, stampActiveRes] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("active", true).gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("customers").select("id").eq("active", true),
        supabase.from("point_transactions").select("merchant_customer_id").eq("transaction_type", "nfc_stamp").gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      const totalActive = activeRes.count || 0;
      const activeWithStamps = new Set((stampActiveRes.data || []).map((r) => r.merchant_customer_id)).size;
      const rate = totalActive > 0 ? Math.round((activeWithStamps / totalActive) * 100) : 0;

      setKpis({
        activeCustomers: totalActive,
        newCustomers7d: newRes.count || 0,
        activityRate: rate,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadChart = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [customersRes, stampsRes] = await Promise.all([
        supabase.from("customers").select("created_at").gte("created_at", thirtyDaysAgo.toISOString()).order("created_at"),
        supabase.from("point_transactions").select("created_at").eq("transaction_type", "nfc_stamp").gte("created_at", thirtyDaysAgo.toISOString()).order("created_at"),
      ]);

      const dateMap: Record<string, { kunden: number; stempel: number }> = {};

      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - 29 + i);
        const key = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
        dateMap[key] = { kunden: 0, stempel: 0 };
      }

      (customersRes.data || []).forEach((c) => {
        const key = new Date(c.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
        if (dateMap[key]) dateMap[key].kunden++;
      });

      (stampsRes.data || []).forEach((s) => {
        const key = new Date(s.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
        if (dateMap[key]) dateMap[key].stempel++;
      });

      setChartData(Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals })));
    } catch (e) {
      console.error(e);
    }
  };

  const loadLiveFeed = async () => {
    try {
      const { data } = await supabase
        .from("point_transactions")
        .select("id, created_at, merchant_customer_id, points_change, transaction_type, description")
        .eq("transaction_type", "nfc_stamp")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!data || data.length === 0) {
        setLiveFeed([]);
        return;
      }

      const merchantIds = [...new Set(data.map((d) => d.merchant_customer_id))];
      const { data: merchants } = await supabase
        .from("customers")
        .select("id, name, industry")
        .in("id", merchantIds);

      const merchantMap = new Map((merchants || []).map((m) => [m.id, m]));

      setLiveFeed(
        data.map((tx) => ({
          ...tx,
          merchant: merchantMap.get(tx.merchant_customer_id),
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="text-sm text-muted-foreground">Dein täglicher Überblick</p>
        </div>
        <Button onClick={loadDashboard} variant="outline" size="sm" className="gap-2 bg-white">
          <RefreshCw className="w-3.5 h-3.5" />
          Aktualisieren
        </Button>
      </div>

      {/* Action Layer - Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                alert.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : alert.type === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-sm font-medium">{alert.message}</span>
              {alert.link && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => navigate(alert.link!)}
                >
                  {alert.action} <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Core KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(262,50%,55%)] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktive Kunden</p>
              <p className="text-2xl font-bold">{kpis.activeCustomers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(150,50%,45%)] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Neue Kunden (7 Tage)</p>
              <p className="text-2xl font-bold">{kpis.newCustomers7d}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(210,70%,50%)] flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktivitätsrate (mit Stempel)</p>
              <p className="text-2xl font-bold">{kpis.activityRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Chart */}
        <Card className="col-span-2 p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
          <h2 className="text-sm font-semibold mb-4">Grow Insights (30 Tage)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="kunden" stroke="hsl(262, 50%, 55%)" name="Kundenwachstum" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="stempel" stroke="hsl(150, 50%, 45%)" name="Stempelaktivität" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Live Feed */}
        <Card className="p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold">Live Feed</h2>
          </div>
          <div className="space-y-3">
            {liveFeed.length > 0 ? (
              liveFeed.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <div className="w-7 h-7 rounded-full bg-[hsl(262,40%,90%)] flex items-center justify-center shrink-0 mt-0.5">
                    <Stamp className="w-3.5 h-3.5 text-[hsl(262,50%,45%)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.merchant?.name || "Unbekannt"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      +{tx.points_change} Punkte · {format(new Date(tx.created_at), "HH:mm", { locale: de })} Uhr
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Noch keine Aktivität heute
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Overview;
