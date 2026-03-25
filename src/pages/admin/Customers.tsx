import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, RefreshCw, Plus, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Customer {
  id: string;
  name: string;
  industry: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  created_at: string;
  active: boolean;
  logo_url: string | null;
  status: string | null;
}

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [activeTab, setActiveTab] = useState("alle");

  // Message dialog
  const [messageCustomer, setMessageCustomer] = useState<Customer | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, industry, street, postal_code, city, phone, created_at, active, logo_url, status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers((data as Customer[]) || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Kunden");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);
  useEffect(() => { applyFilters(); }, [customers, searchTerm, categoryFilter, sortBy, activeTab]);

  const applyFilters = () => {
    let filtered = [...customers];

    // Tab filter
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    switch (activeTab) {
      case "aktiv":
        filtered = filtered.filter((c) => c.active);
        break;
      case "inaktiv":
        filtered = filtered.filter((c) => !c.active);
        break;
      case "neu":
        filtered = filtered.filter((c) => new Date(c.created_at) >= sevenDaysAgo);
        break;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.city?.toLowerCase().includes(term) ||
          c.industry?.toLowerCase().includes(term) ||
          c.phone?.includes(term)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((c) => c.industry === categoryFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "created_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc": return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        default: return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  const categories = [...new Set(customers.map((c) => c.industry).filter(Boolean))];

  const getAddress = (customer: Customer) => {
    const parts = [customer.postal_code, customer.city].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  const getStatusBadge = (customer: Customer) => {
    if (customer.status === "paused") return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pausiert</Badge>;
    if (customer.status === "canceled" || customer.status === "past_due") return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{customer.status === "past_due" ? "Überfällig" : "Gekündigt"}</Badge>;
    if (customer.active) return <Badge className="bg-green-500/90 text-[10px] px-1.5 py-0">Aktiv</Badge>;
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Inaktiv</Badge>;
  };

  const handleSendMessage = async () => {
    if (!messageCustomer || !messageSubject.trim() || !messageBody.trim()) {
      toast.error("Bitte Betreff und Nachricht ausfüllen");
      return;
    }
    setSendingMessage(true);
    try {
      const { error } = await supabase.from("admin_merchant_messages" as any).insert({
        customer_id: messageCustomer.id,
        subject: messageSubject.trim(),
        body: messageBody.trim(),
      } as any);
      if (error) throw error;
      toast.success("Nachricht gesendet");
      setMessageCustomer(null);
      setMessageSubject("");
      setMessageBody("");
    } catch (e: any) {
      toast.error("Fehler beim Senden");
      console.error(e);
    } finally {
      setSendingMessage(false);
    }
  };

  const activeCount = customers.filter((c) => c.active).length;
  const inactiveCount = customers.filter((c) => !c.active).length;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newCount = customers.filter((c) => new Date(c.created_at) >= sevenDaysAgo).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Kundenverwaltung</h1>
          <p className="text-xs text-muted-foreground">
            {filteredCustomers.length} von {customers.length} Kunden
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadCustomers}>
            <RefreshCw className="w-3 h-3 mr-1" /> Aktualisieren
          </Button>
          <Button size="sm" onClick={() => navigate("/admin/checkout")}>
            <Plus className="w-3 h-3 mr-1" /> Neuer Kunde
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="alle">Alle ({customers.length})</TabsTrigger>
          <TabsTrigger value="aktiv">Aktiv ({activeCount})</TabsTrigger>
          <TabsTrigger value="inaktiv">Inaktiv ({inactiveCount})</TabsTrigger>
          <TabsTrigger value="neu">Neu 7d ({newCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex gap-2 items-center bg-white p-2 rounded-xl border border-border/30 shadow-sm">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pl-8 text-sm" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-[150px] text-sm"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories.map((cat) => (<SelectItem key={cat} value={cat!}>{cat}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-8 w-[130px] text-sm"><SelectValue placeholder="Sortierung" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Neueste</SelectItem>
            <SelectItem value="created_asc">Älteste</SelectItem>
            <SelectItem value="name_asc">A-Z</SelectItem>
            <SelectItem value="name_desc">Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Laden...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {customers.length === 0 ? "Noch keine Kunden angelegt" : "Keine Ergebnisse"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-9 text-xs font-semibold">Kunde</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Kategorie</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Adresse</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Telefon</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Status</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Angelegt</TableHead>
                <TableHead className="h-9 text-xs font-semibold w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-[hsl(262,40%,97%)] transition-colors"
                  onClick={() => navigate(`/admin/customers/${customer.id}`)}
                >
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-border/50 bg-muted/30 flex items-center justify-center shrink-0">
                        {customer.logo_url ? (
                          <img src={customer.logo_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">{customer.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="font-medium text-sm">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">{customer.industry || "—"}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[160px]">{getAddress(customer)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {customer.phone ? (
                      <div className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3 text-muted-foreground" />{customer.phone}</div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">{getStatusBadge(customer)}</TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Nachricht senden"
                      onClick={() => setMessageCustomer(customer)}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Send Message Dialog */}
      <Dialog open={!!messageCustomer} onOpenChange={(open) => !open && setMessageCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nachricht an {messageCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Betreff</Label>
              <Input value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Betreff..." />
            </div>
            <div>
              <Label className="text-xs">Nachricht</Label>
              <Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Nachricht eingeben..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageCustomer(null)}>Abbrechen</Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage}>
              <Send className="w-3 h-3 mr-1" />
              {sendingMessage ? "Senden..." : "Senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
