import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { appSupabase } from "@/integrations/app-supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Stamp, BarChart3, AlertTriangle, UserPlus, XCircle, Clock, Package } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const Overview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    merchants: 0,
    stamps: 0,
    contacts: 0,
    pendingOrders: 0,
  });

  const [recentMerchants, setRecentMerchants] = useState<any[]>([]);
  const [criticalEvents, setCriticalEvents] = useState<any[]>([]);
  const [recentStamps, setRecentStamps] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentMerchants();
    loadCriticalEvents();
    loadRecentStamps();

    // Setup realtime subscription for stamps (from Lovable Cloud)
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
      // Merchants come from App-DB (no is_active column - all merchants are active)
      const merchantsRes = await appSupabase
        .from("merchants")
        .select("id", { count: "exact", head: true });

      // Stamps, contacts, orders come from Lovable Cloud
      const [stampsRes, contactsRes, pendingOrdersRes] = await Promise.all([
        supabase.from("stamps").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        merchants: merchantsRes.count || 0,
        stamps: stampsRes.count || 0,
        contacts: contactsRes.count || 0,
        pendingOrders: pendingOrdersRes.count || 0,
      });
    } catch (error) {
      console.error("Fehler beim Laden der Statistiken:", error);
    }
  };

  const loadRecentMerchants = async () => {
    try {
      // Load merchants from App-DB (no email/is_active columns)
      const { data, error } = await appSupabase
        .from("merchants")
        .select("id, name, category, city, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentMerchants(data || []);
    } catch (error) {
      console.error("Fehler beim Laden neuer Kunden:", error);
    }
  };

  const loadCriticalEvents = async () => {
    try {
      // Critical events from Lovable Cloud customers table (has Stripe status)
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
      // Stamps from Lovable Cloud, but we need to get merchant names from App-DB
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

      // Get unique customer IDs and fetch merchant names from App-DB
      const customerIds = [...new Set(stampsData.map(s => s.customer_id))] as string[];
      const { data: merchantsData } = await appSupabase
        .from("merchants")
        .select("id, name, category")
        .in("id", customerIds);

      const merchantMap = new Map((merchantsData || []).map((m: any) => [m.id, m]));

      const stampsWithMerchants = stampsData.map(stamp => ({
        ...stamp,
        merchant: merchantMap.get(stamp.customer_id) || null
      }));

      setRecentStamps(stampsWithMerchants);
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
              <p className="text-2xl font-bold">{stats.merchants}</p>
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
                      Stempel bei <span className="font-medium">{stamp.merchant?.name || "Unbekannt"}</span>
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

        {/* New Merchants (from App-DB) */}
        <Card className="p-6 border-border">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Neue Kunden</h2>
          </div>
          <div className="space-y-3">
            {recentMerchants.length > 0 ? (
              recentMerchants.map((merchant) => (
                <div key={merchant.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{merchant.name}</p>
                    <p className="text-xs text-muted-foreground">{merchant.category || merchant.city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Aktiv</Badge>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(merchant.created_at), "dd.MM.yyyy", { locale: de })}
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

      {/* Critical Events (Stripe-related, from Lovable Cloud) */}
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
