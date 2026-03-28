import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, RefreshCw,
  TrendingUp, Activity, Stamp, ArrowRight, UserPlus, CalendarDays,
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
    activeWithStamps: 0,
    totalCustomersEver: 0,
    stillActive: 0,
  });
  const [newCustomersList, setNewCustomersList] = useState<Array<{ name: string; created_at: string; industry: string | null }>>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);

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
    await Promise.all([loadAlerts(), loadKPIs(), loadChart(), loadLiveFeed(), loadAppointments()]);
    setLoading(false);
  };

  const loadAppointments = async () => {
    try {
      const now = new Date().toISOString();
      const { data, count } = await supabase
        .from("pipeline_appointments")
        .select("id, title, scheduled_at, duration_minutes, lead_id, address, pipeline_leads!inner(shop_name, phone)", { count: "exact" })
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(5);
      setUpcomingAppointments(data || []);
      setAppointmentCount(count || 0);
    } catch (e) { console.error(e); }
  };

  const loadAlerts = async () => {
    const newAlerts: Alert[] = [];
    try {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const { data: activeCustomers } = await supabase.from("customers").select("id, name").eq("active", true);
      if (activeCustomers && activeCustomers.length > 0) {
        const { data: recentActivity } = await supabase.from("point_transactions").select("merchant_customer_id").eq("transaction_type", "nfc_stamp").gte("created_at", fiveDaysAgo.toISOString());
        const activeIds = new Set((recentActivity || []).map((r) => r.merchant_customer_id));
        const inactive = activeCustomers.filter((c) => !activeIds.has(c.id));
        if (inactive.length > 0) {
          newAlerts.push({ type: "warning", message: `${inactive.length} Kunde${inactive.length > 1 ? "n" : ""} ohne Stempelaktivität (5+ Tage)`, action: "Anzeigen", link: "/admin/customers" });
        }
      }
    } catch (e) { console.error(e); }
    try {
      const { count } = await supabase.from("support_messages").select("id", { count: "exact", head: true }).eq("status", "new");
      if (count && count > 0) {
        newAlerts.push({ type: "error", message: `${count} Support-Nachricht${count > 1 ? "en" : ""} unbeantwortet`, action: "Öffnen", link: "/admin/orders" });
      }
    } catch (e) { console.error(e); }
    try {
      const { data: allBoxes } = await supabase.from("boxes").select("id");
      const { data: assignedBoxes } = await supabase.from("customer_boxes").select("box_id");
      const assignedIds = new Set((assignedBoxes || []).map((b) => b.box_id));
      const available = (allBoxes || []).filter((b) => !assignedIds.has(b.id)).length;
      if (available < 3) {
        newAlerts.push({ type: available === 0 ? "error" : "warning", message: available === 0 ? "Keine Box-IDs mehr verfügbar!" : `Nur noch ${available} Box-ID${available > 1 ? "s" : ""} verfügbar`, action: "Box-IDs verwalten", link: "/admin/boxes" });
      }
    } catch (e) { console.error(e); }
    try {
      const { count } = await supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "new");
      if (count && count > 0) {
        newAlerts.push({ type: "warning", message: `${count} Kontaktanfrage${count > 1 ? "n" : ""} unbeantwortet`, action: "Öffnen", link: "/admin/orders" });
      }
    } catch (e) { console.error(e); }
    setAlerts(newAlerts);
  };

  const loadKPIs = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [activeRes, newRes, totalRes, stampActiveRes, newCustomersRes] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("active", true).gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("point_transactions").select("merchant_customer_id").eq("transaction_type", "nfc_stamp").gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("customers").select("name, created_at, industry").gte("created_at", sevenDaysAgo.toISOString()).order("created_at", { ascending: false }).limit(20),
      ]);

      const totalActive = activeRes.count || 0;
      const activeWithStamps = new Set((stampActiveRes.data || []).map((r) => r.merchant_customer_id)).size;
      const rate = totalActive > 0 ? Math.round((activeWithStamps / totalActive) * 100) : 0;

      setKpis({
        activeCustomers: totalActive,
        newCustomers7d: newRes.count || 0,
        activityRate: rate,
        activeWithStamps,
        totalCustomersEver: totalRes.count || 0,
        stillActive: totalActive,
      });
      setNewCustomersList(newCustomersRes.data || []);
    } catch (e) { console.error(e); }
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
        const d = new Date(); d.setDate(d.getDate() - 29 + i);
        const key = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
        dateMap[key] = { kunden: 0, stempel: 0 };
      }
      (customersRes.data || []).forEach((c) => { const key = new Date(c.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }); if (dateMap[key]) dateMap[key].kunden++; });
      (stampsRes.data || []).forEach((s) => { const key = new Date(s.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }); if (dateMap[key]) dateMap[key].stempel++; });
      setChartData(Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals })));
    } catch (e) { console.error(e); }
  };

  const loadLiveFeed = async () => {
    try {
      const { data } = await supabase.from("point_transactions").select("id, created_at, merchant_customer_id, points_change, transaction_type, description").eq("transaction_type", "nfc_stamp").order("created_at", { ascending: false }).limit(5);
      if (!data || data.length === 0) { setLiveFeed([]); return; }
      const merchantIds = [...new Set(data.map((d) => d.merchant_customer_id))];
      const { data: merchants } = await supabase.from("customers").select("id, name, industry").in("id", merchantIds);
      const merchantMap = new Map((merchants || []).map((m) => [m.id, m]));
      setLiveFeed(data.map((tx) => ({ ...tx, merchant: merchantMap.get(tx.merchant_customer_id) })));
    } catch (e) { console.error(e); }
  };

  const toggleKpi = (key: string) => {
    setExpandedKpi(expandedKpi === key ? null : key);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="text-sm text-muted-foreground">Dein täglicher Überblick</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/admin/checkout")} size="sm" className="gap-2">
            <UserPlus className="w-3.5 h-3.5" />
            Kunde abschließen
          </Button>
          <Button onClick={loadDashboard} variant="outline" size="sm" className="gap-2 bg-white">
            <RefreshCw className="w-3.5 h-3.5" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Action Layer - Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${alert.type === "error" ? "bg-red-50 border-red-200 text-red-800" : alert.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-sm font-medium">{alert.message}</span>
              {alert.link && (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate(alert.link!)}>
                  {alert.action} <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Core KPIs with expandable hover details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Aktive Kunden */}
        <div>
          <Card
            className="p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] cursor-pointer hover:shadow-md transition-shadow"
            onMouseEnter={() => toggleKpi("active")}
            onMouseLeave={() => setExpandedKpi(null)}
          >
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
          {expandedKpi === "active" && (
            <Card className="mt-1 p-4 bg-white rounded-xl border-border/30 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-10 relative">
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Details: Aktive Kunden</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Abschlüsse insgesamt</span><span className="font-bold">{kpis.totalCustomersEver}</span></div>
                <div className="flex justify-between"><span>Davon aktuell aktiv</span><span className="font-bold text-green-600">{kpis.stillActive}</span></div>
                <div className="flex justify-between"><span>Inaktiv / Gekündigt</span><span className="font-bold text-red-500">{kpis.totalCustomersEver - kpis.stillActive}</span></div>
                <div className="flex justify-between"><span>Aktivierungsrate</span><span className="font-bold">{kpis.totalCustomersEver > 0 ? Math.round((kpis.stillActive / kpis.totalCustomersEver) * 100) : 0}%</span></div>
              </div>
            </Card>
          )}
        </div>

        {/* Neue Kunden 7 Tage */}
        <div>
          <Card
            className="p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] cursor-pointer hover:shadow-md transition-shadow"
            onMouseEnter={() => toggleKpi("new7d")}
            onMouseLeave={() => setExpandedKpi(null)}
          >
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
          {expandedKpi === "new7d" && (
            <Card className="mt-1 p-4 bg-white rounded-xl border-border/30 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-10 relative">
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Neue Kunden (letzte 7 Tage)</h4>
              {newCustomersList.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {newCustomersList.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/20 last:border-0">
                      <div>
                        <span className="font-medium">{c.name}</span>
                        {c.industry && <span className="text-xs text-muted-foreground ml-1.5">({c.industry})</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd.MM.", { locale: de })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine neuen Kunden</p>
              )}
            </Card>
          )}
        </div>

        {/* Aktivitätsrate */}
        <div>
          <Card
            className="p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] cursor-pointer hover:shadow-md transition-shadow"
            onMouseEnter={() => toggleKpi("activity")}
            onMouseLeave={() => setExpandedKpi(null)}
          >
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
          {expandedKpi === "activity" && (
            <Card className="mt-1 p-4 bg-white rounded-xl border-border/30 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-10 relative">
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Berechnung der Aktivitätsrate</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Aktive Kunden gesamt</span><span className="font-bold">{kpis.activeCustomers}</span></div>
                <div className="flex justify-between"><span>Davon mit Stempelaktivität (7 Tage)</span><span className="font-bold text-green-600">{kpis.activeWithStamps}</span></div>
                <div className="flex justify-between"><span>Ohne Stempelaktivität</span><span className="font-bold text-amber-600">{kpis.activeCustomers - kpis.activeWithStamps}</span></div>
                <div className="border-t pt-1.5 mt-1.5">
                  <p className="text-xs text-muted-foreground">
                    Formel: {kpis.activeWithStamps} von {kpis.activeCustomers} aktiven Kunden haben in den letzten 7 Tagen mindestens eine Stempeltransaktion (NFC) durchgeführt = <strong>{kpis.activityRate}%</strong>
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Anstehende Termine */}
        <div>
          <Card
            className="p-5 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] cursor-pointer hover:shadow-md transition-shadow"
            onMouseEnter={() => toggleKpi("appointments")}
            onMouseLeave={() => setExpandedKpi(null)}
            onClick={() => navigate("/admin/calendar")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(30,80%,50%)] flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Anstehende Termine</p>
                <p className="text-2xl font-bold">{appointmentCount}</p>
              </div>
            </div>
          </Card>
          {expandedKpi === "appointments" && (
            <Card className="mt-1 p-4 bg-white rounded-xl border-border/30 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-10 relative">
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Nächste Termine</h4>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-2">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-border/20 last:border-0 cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1"
                      onClick={() => navigate("/admin/calendar")}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{apt.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(apt as any).pipeline_leads?.shop_name}
                          {(apt as any).pipeline_leads?.phone && ` · ${(apt as any).pipeline_leads.phone}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-medium">{format(new Date(apt.scheduled_at), "dd.MM.", { locale: de })}</p>
                        <p className="text-[11px] text-muted-foreground">{format(new Date(apt.scheduled_at), "HH:mm", { locale: de })} Uhr</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine anstehenden Termine</p>
              )}
            </Card>
          )}
        </div>
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
                    <p className="text-sm font-medium truncate">{tx.merchant?.name || "Unbekannt"}</p>
                    <p className="text-[11px] text-muted-foreground">+{tx.points_change} Punkte · {format(new Date(tx.created_at), "HH:mm", { locale: de })} Uhr</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Noch keine Aktivität heute</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Overview;
