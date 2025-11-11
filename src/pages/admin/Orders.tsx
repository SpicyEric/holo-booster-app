import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package, Palette, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Order {
  id: string;
  created_at: string;
  order_type: string;
  quantity: number | null;
  amount_cents: number | null;
  status: string;
  paid_at: string | null;
  order_details: any;
  customer_id: string;
  customers: {
    name: string;
    customer_number: number;
  };
}

export default function Orders() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (user) {
      checkUserRole();
      loadOrders();
    }
  }, [user, filterStatus]);

  const checkUserRole = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id);

    if (roles && roles.length > 0) {
      // Admin has priority
      if (roles.some(r => r.role === "admin")) {
        setUserRole("admin");
      } else if (roles.some(r => r.role === "merchant")) {
        setUserRole("merchant");
      }
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("orders")
        .select(`
          *,
          customers (
            name,
            customer_number
          )
        `)
        .in("order_type", ["aufsteller", "design"])
        .order("created_at", { ascending: false });

      // Filter by status if not "all"
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      // If merchant, only show orders for assigned customers
      if (userRole === "merchant") {
        const { data: assignments } = await supabase
          .from("merchant_assignments")
          .select("customer_id")
          .eq("merchant_user_id", user?.id);

        if (assignments && assignments.length > 0) {
          const customerIds = assignments.map(a => a.customer_id);
          query = query.in("customer_id", customerIds);
        } else {
          // Merchant has no assignments
          setOrders([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Fehler beim Laden der Bestellungen");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Status aktualisiert");
      loadOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Fehler beim Aktualisieren des Status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Offen</Badge>;
      case "in_progress":
        return <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" />In Bearbeitung</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Abgeschlossen</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Storniert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOrderIcon = (orderType: string) => {
    switch (orderType) {
      case "aufsteller":
        return <Package className="h-5 w-5 text-primary" />;
      case "design":
        return <Palette className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getOrderTypeName = (orderType: string) => {
    switch (orderType) {
      case "aufsteller":
        return "Aufsteller";
      case "design":
        return "Design";
      default:
        return orderType;
    }
  };

  const formatAmount = (cents: number | null) => {
    if (!cents) return "—";
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const inProgressCount = orders.filter(o => o.status === "in_progress").length;
  const completedCount = orders.filter(o => o.status === "completed").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bestellungen</h2>
        <p className="text-muted-foreground">
          Verwalten Sie alle Aufsteller- und Design-Bestellungen
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Offen</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Bearbeitung</CardDescription>
            <CardTitle className="text-3xl">{inProgressCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Abgeschlossen</CardDescription>
            <CardTitle className="text-3xl">{completedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Bestellungen</SelectItem>
            <SelectItem value="pending">Offen</SelectItem>
            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
            <SelectItem value="cancelled">Storniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Bestellungen ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine Bestellungen gefunden
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-muted rounded-lg">
                      {getOrderIcon(order.order_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">
                          {order.customers.name}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          #{order.customers.customer_number}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getOrderTypeName(order.order_type)} 
                        {order.quantity && ` • ${order.quantity}x`}
                        {" • "}
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatAmount(order.amount_cents)}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>

                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Offen</SelectItem>
                        <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                        <SelectItem value="completed">Abgeschlossen</SelectItem>
                        <SelectItem value="cancelled">Storniert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
