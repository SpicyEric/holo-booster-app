import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, QrCode, BarChart3, Settings } from "lucide-react";

const Overview = () => {
  const [stats, setStats] = useState({
    customers: 0,
    scans: 0,
    contacts: 0,
    orders: 0,
  });

  useEffect(() => {
    loadStats();
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
    </div>
  );
};

export default Overview;
