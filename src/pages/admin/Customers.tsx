import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Plus, Edit, QrCode, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  company_name: string | null;
  google_review_url: string;
  offer_text: string;
  logo_url: string | null;
  qr_code_url: string | null;
  active: boolean;
  status: string | null;
  created_at: string;
  priority: string | null;
  lead_source: string | null;
}

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [customers, searchTerm, statusFilter, sortBy, priorityFilter]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Kunden");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.company_name?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((c) => c.active && c.status === "active");
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((c) => !c.active);
      } else {
        filtered = filtered.filter((c) => c.status === statusFilter);
      }
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((c) => c.priority === priorityFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  const getStatusBadge = (customer: Customer) => {
    if (!customer.active) {
      return <Badge variant="secondary">Inaktiv</Badge>;
    }
    switch (customer.status) {
      case "active":
        return <Badge variant="default">Aktiv</Badge>;
      case "pending":
        return <Badge variant="outline">Ausstehend</Badge>;
      case "past_due":
        return <Badge variant="destructive">Überfällig</Badge>;
      case "canceled":
        return <Badge variant="secondary">Gekündigt</Badge>;
      default:
        return <Badge variant="outline">{customer.status || "Unbekannt"}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority || priority === "normal") return null;
    
    if (priority === "high") {
      return <Badge variant="destructive">Hoch</Badge>;
    } else if (priority === "low") {
      return <Badge variant="secondary">Niedrig</Badge>;
    }
    
    return <Badge variant="outline">{priority}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Kundenverwaltung
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? "Kunde" : "Kunden"}
            {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
              ? ` (gefiltert von ${customers.length} gesamt)` 
              : ""}
          </p>
        </div>
        <GradientButton
          onClick={() => navigate("/admin/customers/new")}
          icon={Plus}
        >
          Neuer Kunde
        </GradientButton>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Name, Firma oder E-Mail suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="pending">Ausstehend</SelectItem>
              <SelectItem value="past_due">Überfällig</SelectItem>
              <SelectItem value="canceled">Gekündigt</SelectItem>
              <SelectItem value="inactive">Inaktiv</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Priorität filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Prioritäten</SelectItem>
              <SelectItem value="high">Hoch</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Niedrig</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sortierung" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Neueste zuerst</SelectItem>
              <SelectItem value="created_asc">Älteste zuerst</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      <GlassCard>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gradient-primary animate-pulse-glow mx-auto" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {customers.length === 0 
                ? "Noch keine Kunden angelegt" 
                : "Keine Kunden gefunden mit den aktuellen Filtern"}
            </p>
            {customers.length === 0 && (
              <GradientButton
                onClick={() => navigate("/admin/customers/new")}
                icon={Plus}
              >
                Ersten Kunden anlegen
              </GradientButton>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priorität</TableHead>
                <TableHead>QR-Code</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {customer.logo_url && (
                        <img
                          src={customer.logo_url}
                          alt={customer.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-semibold">{customer.name}</div>
                        {customer.email && (
                          <div className="text-sm text-muted-foreground">
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(customer)}</TableCell>
                  <TableCell>{getPriorityBadge(customer.priority)}</TableCell>
                  <TableCell>
                    {customer.qr_code_url ? (
                      <QrCode className="w-5 h-5 text-primary" />
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Nicht generiert
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(customer.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() =>
                        navigate(`/admin/customers/${customer.id}`)
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-background/50 hover:bg-background border border-border rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Bearbeiten
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>
    </div>
  );
};

export default Customers;
