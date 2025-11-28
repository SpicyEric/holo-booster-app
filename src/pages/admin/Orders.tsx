import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Package, Palette, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";

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

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      if (userRole === "merchant") {
        const { data: assignments } = await supabase
          .from("merchant_assignments")
          .select("customer_id")
          .eq("merchant_user_id", user?.id);

        if (assignments && assignments.length > 0) {
          const customerIds = assignments.map(a => a.customer_id);
          query = query.in("customer_id", customerIds);
        } else {
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
      toast.error("Fehler beim Laden");
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
      toast.error("Fehler");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1 text-xs"><Clock className="h-2.5 w-2.5" />Offen</Badge>;
      case "in_progress":
        return <Badge variant="default" className="gap-1 text-xs"><Clock className="h-2.5 w-2.5" />Bearbeitung</Badge>;
      case "completed":
        return <Badge className="bg-green-600 gap-1 text-xs"><CheckCircle2 className="h-2.5 w-2.5" />Fertig</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-2.5 w-2.5" />Storniert</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getOrderIcon = (orderType: string) => {
    switch (orderType) {
      case "aufsteller":
        return <Package className="h-3.5 w-3.5 text-primary" />;
      case "design":
        return <Palette className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return null;
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
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const inProgressCount = orders.filter(o => o.status === "in_progress").length;
  const completedCount = orders.filter(o => o.status === "completed").length;

  return (
    <div className="space-y-3">
      {/* Header - compact */}
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h1 className="text-xl font-semibold">Bestellungen</h1>
          <p className="text-xs text-muted-foreground">
            {orders.length} Bestellungen · {pendingCount} offen · {inProgressCount} in Bearbeitung · {completedCount} fertig
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => loadOrders()}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Aktualisieren
        </Button>
      </div>

      {/* Filter - compact */}
      <div className="flex gap-2 items-center bg-muted/30 p-2 rounded border">
        <span className="text-xs text-muted-foreground">Status:</span>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[150px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="pending">Offen</SelectItem>
            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
            <SelectItem value="completed">Fertig</SelectItem>
            <SelectItem value="cancelled">Storniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table - dense */}
      <div className="border rounded">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Laden...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Keine Bestellungen gefunden
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-8 text-xs font-semibold w-8"></TableHead>
                <TableHead className="h-8 text-xs font-semibold">Bestellnr.</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Kunde</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Typ</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Menge</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Betrag</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Datum</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Status</TableHead>
                <TableHead className="h-8 text-xs font-semibold w-32">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-accent/30">
                  <TableCell className="py-1.5">
                    {getOrderIcon(order.order_type)}
                  </TableCell>
                  <TableCell className="py-1.5 font-mono text-xs">
                    {order.id.substring(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div>
                      <p className="text-sm font-medium">{order.customers?.name || "—"}</p>
                      {order.customers?.customer_number && (
                        <p className="text-[10px] text-muted-foreground">#{order.customers.customer_number}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-sm">
                    {order.order_type === "aufsteller" ? "Aufsteller" : order.order_type === "design" ? "Design" : order.order_type}
                  </TableCell>
                  <TableCell className="py-1.5 text-sm">
                    {order.quantity || "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-sm font-medium">
                    {formatAmount(order.amount_cents)}
                  </TableCell>
                  <TableCell className="py-1.5 text-xs text-muted-foreground">
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell className="py-1.5">
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Offen</SelectItem>
                        <SelectItem value="in_progress">Bearbeitung</SelectItem>
                        <SelectItem value="completed">Fertig</SelectItem>
                        <SelectItem value="cancelled">Storniert</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
