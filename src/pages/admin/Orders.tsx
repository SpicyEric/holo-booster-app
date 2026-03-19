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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, Palette, CheckCircle2, Clock, XCircle, RefreshCw, Store, Trash2, HeadphonesIcon, Bug, HelpCircle, MessageSquare, Mail } from "lucide-react";

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

interface ShopSuggestion {
  id: string;
  created_at: string;
  shop_name: string;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  contact_person: string | null;
  status: string;
}

interface SupportMessage {
  id: string;
  created_at: string;
  category: string;
  message: string;
  status: string;
  admin_notes: string | null;
}

interface ContactSubmission {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  admin_notes: string | null;
}

export default function Orders() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [suggestions, setSuggestions] = useState<ShopSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportLoading, setSupportLoading] = useState(true);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [contactLoading, setContactLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => {
    if (user) {
      checkUserRole();
      loadOrders();
      loadSuggestions();
      loadSupportMessages();
      loadContactSubmissions();
    }
  }, [user, filterStatus]);

  const loadSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const { data, error } = await supabase
        .from("shop_suggestions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const loadSupportMessages = async () => {
    try {
      setSupportLoading(true);
      const { data, error } = await supabase
        .from("support_messages" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSupportMessages((data as any) || []);
    } catch (error) {
      console.error("Error loading support messages:", error);
    } finally {
      setSupportLoading(false);
    }
  };

  const loadContactSubmissions = async () => {
    try {
      setContactLoading(true);
      const { data, error } = await supabase
        .from("contact_submissions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setContactSubmissions((data as any) || []);
    } catch (error) {
      console.error("Error loading contact submissions:", error);
    } finally {
      setContactLoading(false);
    }
  };

  const updateContactStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("contact_submissions" as any)
        .update({ status: newStatus } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Status aktualisiert");
      loadContactSubmissions();
    } catch (error) {
      console.error("Error updating contact submission:", error);
      toast.error("Fehler");
    }
  };

  const deleteContactSubmission = async (id: string) => {
    try {
      const { error } = await supabase
        .from("contact_submissions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Kontaktanfrage gelöscht");
      loadContactSubmissions();
    } catch (error) {
      console.error("Error deleting contact submission:", error);
      toast.error("Fehler");
    }
  };
    try {
      const { error } = await supabase
        .from("support_messages" as any)
        .update({ status: newStatus } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Status aktualisiert");
      loadSupportMessages();
    } catch (error) {
      console.error("Error updating support message:", error);
      toast.error("Fehler");
    }
  };

  const deleteSupportMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from("support_messages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Nachricht gelöscht");
      loadSupportMessages();
    } catch (error) {
      console.error("Error deleting support message:", error);
      toast.error("Fehler");
    }
  };

  const updateSuggestionStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("shop_suggestions")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      toast.success("Status aktualisiert");
      loadSuggestions();
    } catch (error) {
      console.error("Error updating suggestion:", error);
      toast.error("Fehler");
    }
  };

  const deleteSuggestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("shop_suggestions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Vorschlag gelöscht");
      loadSuggestions();
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      toast.error("Fehler");
    }
  };

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
  const newSuggestionsCount = suggestions.filter(s => s.status === "new").length;
  const newSupportCount = supportMessages.filter(m => m.status === "new").length;
  const newContactCount = contactSubmissions.filter(c => c.status === "new").length;

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'bug': return 'Bug';
      case 'question': return 'Frage';
      case 'feedback': return 'Feedback';
      case 'other': return 'Sonstiges';
      default: return cat;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'bug': return <Bug className="h-3.5 w-3.5 text-destructive" />;
      case 'question': return <HelpCircle className="h-3.5 w-3.5 text-primary" />;
      case 'feedback': return <MessageSquare className="h-3.5 w-3.5 text-green-500" />;
      default: return <HeadphonesIcon className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getSuggestionStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="secondary" className="gap-1 text-xs"><Clock className="h-2.5 w-2.5" />Neu</Badge>;
      case "contacted":
        return <Badge variant="default" className="gap-1 text-xs"><CheckCircle2 className="h-2.5 w-2.5" />Kontaktiert</Badge>;
      case "done":
        return <Badge className="bg-green-600 gap-1 text-xs"><CheckCircle2 className="h-2.5 w-2.5" />Erledigt</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-2.5 w-2.5" />Abgelehnt</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h1 className="text-xl font-semibold">Nachrichten</h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => { loadOrders(); loadSuggestions(); loadSupportMessages(); loadContactSubmissions(); }}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Aktualisieren
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">
            Bestellungen ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            Shop-Vorschläge {newSuggestionsCount > 0 && <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 text-[10px]">{newSuggestionsCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="support">
            Support {newSupportCount > 0 && <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 text-[10px]">{newSupportCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {orders.length} Bestellungen · {pendingCount} offen · {inProgressCount} in Bearbeitung · {completedCount} fertig
          </p>

          {/* Filter */}
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

          {/* Orders Table */}
          <div className="border rounded">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Laden...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Keine Bestellungen gefunden</div>
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
                      <TableCell className="py-1.5">{getOrderIcon(order.order_type)}</TableCell>
                      <TableCell className="py-1.5 font-mono text-xs">{order.id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="py-1.5">
                        <div>
                          <p className="text-sm font-medium">{order.customers?.name || "—"}</p>
                          {order.customers?.customer_number && <p className="text-[10px] text-muted-foreground">#{order.customers.customer_number}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 text-sm">{order.order_type === "aufsteller" ? "Aufsteller" : order.order_type === "design" ? "Design" : order.order_type}</TableCell>
                      <TableCell className="py-1.5 text-sm">{order.quantity || "—"}</TableCell>
                      <TableCell className="py-1.5 text-sm font-medium">{formatAmount(order.amount_cents)}</TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                      <TableCell className="py-1.5">{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="py-1.5">
                        <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
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
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {suggestions.length} Vorschläge von App-Nutzern · {newSuggestionsCount} neu
          </p>

          <div className="border rounded">
            {suggestionsLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Laden...</div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                Keine Vorschläge vorhanden
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="h-8 text-xs font-semibold">Shop-Name</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Adresse</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Ansprechpartner</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Datum</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Status</TableHead>
                    <TableHead className="h-8 text-xs font-semibold w-36">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((s) => (
                    <TableRow key={s.id} className="hover:bg-accent/30">
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-2">
                          <Store className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium">{s.shop_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 text-sm">
                        {[s.street, s.house_number].filter(Boolean).join(' ')}
                        {s.postal_code || s.city ? <br /> : null}
                        {[s.postal_code, s.city].filter(Boolean).join(' ')}
                        {!s.street && !s.postal_code && !s.city && "—"}
                      </TableCell>
                      <TableCell className="py-1.5 text-sm">{s.contact_person || "—"}</TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                      <TableCell className="py-1.5">{getSuggestionStatusBadge(s.status)}</TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex gap-1">
                          <Select value={s.status} onValueChange={(value) => updateSuggestionStatus(s.id, value)}>
                            <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Neu</SelectItem>
                              <SelectItem value="contacted">Kontaktiert</SelectItem>
                              <SelectItem value="done">Erledigt</SelectItem>
                              <SelectItem value="rejected">Abgelehnt</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteSuggestion(s.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {supportMessages.length} Support-Nachrichten · {newSupportCount} neu
          </p>

          <div className="border rounded">
            {supportLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Laden...</div>
            ) : supportMessages.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <HeadphonesIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                Keine Support-Nachrichten
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="h-8 text-xs font-semibold w-8"></TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Kategorie</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Nachricht</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Datum</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Status</TableHead>
                    <TableHead className="h-8 text-xs font-semibold w-36">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportMessages.map((m) => (
                    <TableRow key={m.id} className="hover:bg-accent/30">
                      <TableCell className="py-1.5">{getCategoryIcon(m.category)}</TableCell>
                      <TableCell className="py-1.5 text-sm font-medium">{getCategoryLabel(m.category)}</TableCell>
                      <TableCell className="py-1.5 text-sm max-w-xs truncate">{m.message}</TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                      <TableCell className="py-1.5">{getSuggestionStatusBadge(m.status)}</TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex gap-1">
                          <Select value={m.status} onValueChange={(value) => updateSupportStatus(m.id, value)}>
                            <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Neu</SelectItem>
                              <SelectItem value="in_progress">Bearbeitung</SelectItem>
                              <SelectItem value="done">Erledigt</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteSupportMessage(m.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {contactSubmissions.length} Kontaktanfragen · {newContactCount} neu
          </p>

          <div className="border rounded">
            {contactLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Laden...</div>
            ) : contactSubmissions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                Keine Kontaktanfragen
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="h-8 text-xs font-semibold w-8"></TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Name</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">E-Mail</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Telefon</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Nachricht</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Datum</TableHead>
                    <TableHead className="h-8 text-xs font-semibold">Status</TableHead>
                    <TableHead className="h-8 text-xs font-semibold w-36">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactSubmissions.map((c) => (
                    <TableRow key={c.id} className="hover:bg-accent/30">
                      <TableCell className="py-1.5"><Mail className="h-3.5 w-3.5 text-primary" /></TableCell>
                      <TableCell className="py-1.5 text-sm font-medium">{c.name}</TableCell>
                      <TableCell className="py-1.5 text-sm">
                        <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
                      </TableCell>
                      <TableCell className="py-1.5 text-sm">{c.phone || "—"}</TableCell>
                      <TableCell className="py-1.5 text-sm max-w-xs truncate">{c.message}</TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                      <TableCell className="py-1.5">{getSuggestionStatusBadge(c.status)}</TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex gap-1">
                          <Select value={c.status} onValueChange={(value) => updateContactStatus(c.id, value)}>
                            <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Neu</SelectItem>
                              <SelectItem value="contacted">Kontaktiert</SelectItem>
                              <SelectItem value="done">Erledigt</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteContactSubmission(c.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
