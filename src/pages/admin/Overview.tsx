import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, QrCode, BarChart3, Settings, AlertTriangle, UserPlus, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const Overview = () => {
  const [stats, setStats] = useState({
    customers: 0,
    scans: 0,
    contacts: 0,
    orders: 0,
  });

  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [criticalEvents, setCriticalEvents] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentCustomers();
    loadCriticalEvents();
    loadRecentActivities();
  }, []);

  const loadStats = async () => {
    try {
      const [customersRes, scansRes, contactsRes, ordersRes] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("scans").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        customers: customersRes.count || 0,
        scans: scansRes.count || 0,
        contacts: contactsRes.count || 0,
        orders: ordersRes.count || 0,
      });
    } catch (error) {
      console.error("Fehler beim Laden der Statistiken:", error);
    }
  };

  const loadRecentCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, company_name, email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCustomers(data || []);
    } catch (error) {
      console.error("Fehler beim Laden neuer Kunden:", error);
    }
  };

  const loadCriticalEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, company_name, email, status, updated_at")
        .in("status", ["past_due", "canceled"])
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setCriticalEvents(data || []);
    } catch (error) {
      console.error("Fehler beim Laden kritischer Events:", error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      // Get recent scans, new contacts, and new customers
      const [scansRes, contactsRes, customersRes] = await Promise.all([
        supabase
          .from("scans")
          .select("id, created_at, customer_id, customers(name, company_name)")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("contacts")
          .select("id, created_at, customer_id, customers(name, company_name)")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("customers")
          .select("id, name, company_name, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const activities = [
        ...(scansRes.data || []).map((scan: any) => ({
          type: "scan",
          timestamp: scan.created_at,
          customer: scan.customers?.name || scan.customers?.company_name || "Unbekannt",
        })),
        ...(contactsRes.data || []).map((contact: any) => ({
          type: "contact",
          timestamp: contact.created_at,
          customer: contact.customers?.name || contact.customers?.company_name || "Unbekannt",
        })),
        ...(customersRes.data || []).map((customer: any) => ({
          type: "customer",
          timestamp: customer.created_at,
          customer: customer.name || customer.company_name || "Unbekannt",
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);

      setRecentActivities(activities);
    } catch (error) {
      console.error("Fehler beim Laden der Aktivitäten:", error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "scan":
        return <QrCode className="w-4 h-4" />;
      case "contact":
        return <Users className="w-4 h-4" />;
      case "customer":
        return <UserPlus className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityText = (type: string, customer: string) => {
    switch (type) {
      case "scan":
        return `QR-Code gescannt von ${customer}`;
      case "contact":
        return `Neuer Kontakt bei ${customer}`;
      case "customer":
        return `Neuer Kunde: ${customer}`;
      default:
        return "Aktivität";
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
      active: { variant: "default", label: "Aktiv" },
      past_due: { variant: "destructive", label: "Zahlung überfällig" },
      canceled: { variant: "secondary", label: "Gekündigt" },
      pending: { variant: "outline", label: "Ausstehend" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Übersicht über alle Aktivitäten
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aktive Kunden</p>
              <p className="text-2xl font-bold">{stats.customers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scans gesamt</p>
              <p className="text-2xl font-bold">{stats.scans}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Neue Kontakte</p>
              <p className="text-2xl font-bold">{stats.contacts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Offene Orders</p>
              <p className="text-2xl font-bold">{stats.orders}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="p-6 border-border">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Letzte Aktivitäten</h2>
          </div>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{getActivityText(activity.type, activity.customer)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.timestamp), "dd.MM.yyyy, HH:mm", { locale: de })} Uhr
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Keine Aktivitäten</p>
            )}
          </div>
        </Card>

        {/* New Customers */}
        <Card className="p-6 border-border">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Neue Kunden</h2>
          </div>
          <div className="space-y-3">
            {recentCustomers.length > 0 ? (
              recentCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{customer.name || customer.company_name}</p>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(customer.status)}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(customer.created_at), "dd.MM.yyyy", { locale: de })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Keine neuen Kunden</p>
            )}
          </div>
        </Card>
      </div>

      {/* Critical Events */}
      {criticalEvents.length > 0 && (
        <Card className="p-6 border-border border-destructive/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Kritische Events</h2>
          </div>
          <div className="space-y-3">
            {criticalEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors">
                <div className="flex items-center gap-3">
                  {event.status === "canceled" ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">{event.name || event.company_name}</p>
                    <p className="text-xs text-muted-foreground">{event.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(event.status)}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.updated_at), "dd.MM.yyyy", { locale: de })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Overview;
