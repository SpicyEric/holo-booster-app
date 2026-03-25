import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Stamp, BarChart3, AlertTriangle, UserPlus, XCircle, Clock, Package, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

const Overview = () => {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    customers: 0,
    stamps: 0,
    contacts: 0,
    pendingOrders: 0,
  });

  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [criticalEvents, setCriticalEvents] = useState<any[]>([]);
  const [recentStamps, setRecentStamps] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentCustomers();
    loadCriticalEvents();
    loadRecentStamps();

    // Setup realtime subscription for stamps
    const channel = supabase
      .channel('dashboard-stamps')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stamps'
        },
        () => {
          loadRecentStamps();
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    try {
      const [customersRes, stampsRes, contactsRes, pendingOrdersRes] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("stamps").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        customers: customersRes.count || 0,
        stamps: stampsRes.count || 0,
        contacts: contactsRes.count || 0,
        pendingOrders: pendingOrdersRes.count || 0,
      });
    } catch (error) {
      console.error("Fehler beim Laden der Statistiken:", error);
    }
  };

  const loadRecentCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, industry, city, created_at")
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

  const loadRecentStamps = async () => {
    try {
      const { data: stampsData, error: stampsError } = await supabase
        .from("stamps")
        .select("id, created_at, customer_id")
        .order("created_at", { ascending: false })
        .limit(8);

      if (stampsError) throw stampsError;

      if (!stampsData || stampsData.length === 0) {
        setRecentStamps([]);
        return;
      }

      // Get customer names
      const customerIds = [...new Set(stampsData.map(s => s.customer_id))] as string[];
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name, industry")
        .in("id", customerIds);

      const customerMap = new Map((customersData || []).map((c: any) => [c.id, c]));

      const stampsWithCustomers = stampsData.map(stamp => ({
        ...stamp,
        customer: customerMap.get(stamp.customer_id) || null
      }));

      setRecentStamps(stampsWithCustomers);
    } catch (error) {
      console.error("Fehler beim Laden der Stempel:", error);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Übersicht aller Aktivitäten
          </p>
        </div>
        <Button 
          onClick={loadStats} 
          variant="outline"
          className="gap-2 bg-white"
        >
          <RefreshCw className="w-4 h-4" />
          Aktualisieren
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white rounded-2xl border-border/30 shadow-[0_1px_3px_hsl(262,30%,80%/0.3)] hover:shadow-[0_4px_12px_hsl(262,30%,80%/0.4)] transition-shadow">
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
              <Stamp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stempel gesamt</p>
              <p className="text-2xl font-bold">{stats.stamps}</p>
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

        <Card 
          className="p-6 border-border hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate("/admin/orders")}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center relative">
              <Package className="w-6 h-6 text-white" />
              {stats.pendingOrders > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs text-white font-bold">
                  {stats.pendingOrders}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Offene Bestellungen</p>
              <p className="text-2xl font-bold">{stats.pendingOrders}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Stamps */}
        <Card className="p-6 border-border">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Letzte Aktivitäten</h2>
          </div>
          <div className="space-y-3">
            {recentStamps.length > 0 ? (
              recentStamps.map((stamp) => (
                <div key={stamp.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Stamp className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Stempel bei <span className="font-medium">{stamp.customer?.name || "Unbekannt"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(stamp.created_at), "dd.MM.yyyy, HH:mm", { locale: de })} Uhr
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Keine Stempel vorhanden</p>
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
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.industry || customer.city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Aktiv</Badge>
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
                    <p className="font-medium">{event.company_name || event.name}</p>
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
