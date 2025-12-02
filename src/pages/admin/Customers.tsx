import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Search, Trash2, RefreshCw, Plus, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";

interface Customer {
  id: string;
  name: string;
  company_name: string | null;
  industry: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
}

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, company_name, industry, street, house_number, postal_code, city, phone, email, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Kunden");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [customers, searchTerm, industryFilter, sortBy]);

  const handleDelete = async () => {
    if (!deleteCustomer || isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Call the admin-delete-customer edge function for full cleanup
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Nicht authentifiziert");
        return;
      }

      const response = await supabase.functions.invoke("admin-delete-customer", {
        body: { customerId: deleteCustomer.id },
      });

      if (response.error) {
        throw new Error(response.error.message || "Fehler beim Löschen");
      }
      
      toast.success("Kunde erfolgreich gelöscht");
      // Remove from local state immediately
      setCustomers(prev => prev.filter(c => c.id !== deleteCustomer.id));
    } catch (error: any) {
      toast.error("Fehler beim Löschen des Kunden: " + error.message);
      console.error(error);
    } finally {
      setIsDeleting(false);
      setDeleteCustomer(null);
    }
  };

  const applyFilters = () => {
    let filtered = [...customers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.company_name?.toLowerCase().includes(term) ||
          c.city?.toLowerCase().includes(term) ||
          c.industry?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.includes(term)
      );
    }

    if (industryFilter !== "all") {
      filtered = filtered.filter((c) => c.industry === industryFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":
          return (a.name || a.company_name || "").localeCompare(b.name || b.company_name || "");
        case "name_desc":
          return (b.name || b.company_name || "").localeCompare(a.name || a.company_name || "");
        default:
          return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  const industries = [...new Set(customers.map(c => c.industry).filter(Boolean))];

  const getDisplayName = (customer: Customer) => customer.company_name || customer.name;
  const getAddress = (customer: Customer) => {
    const parts = [customer.postal_code, customer.city].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  return (
    <div className="space-y-3">
      {/* Header - compact */}
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h1 className="text-xl font-semibold">Kundenverwaltung</h1>
          <p className="text-xs text-muted-foreground">
            {filteredCustomers.length} von {customers.length} Kunden
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadCustomers}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Aktualisieren
          </Button>
          <Button size="sm" onClick={() => navigate("/admin/checkout")}>
            <Plus className="w-3 h-3 mr-1" />
            Neuer Kunde
          </Button>
        </div>
      </div>

      {/* Filters - compact row */}
      <div className="flex gap-2 items-center bg-muted/30 p-2 rounded border">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-7 text-sm"
          />
        </div>
        
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="h-8 w-[150px] text-sm">
            <SelectValue placeholder="Branche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind!}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-8 w-[140px] text-sm">
            <SelectValue placeholder="Sortierung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Neueste</SelectItem>
            <SelectItem value="created_asc">Älteste</SelectItem>
            <SelectItem value="name_asc">A-Z</SelectItem>
            <SelectItem value="name_desc">Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table - dense */}
      <div className="border rounded">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Laden...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {customers.length === 0 
              ? "Noch keine Kunden angelegt" 
              : "Keine Ergebnisse"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-8 text-xs font-semibold">Firma</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Branche</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Adresse</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Telefon</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Angelegt</TableHead>
                <TableHead className="h-8 text-xs font-semibold w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => navigate(`/admin/customers/${customer.id}`)}
                >
                  <TableCell className="py-2">
                    <div className="font-medium text-sm">{getDisplayName(customer)}</div>
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {customer.industry || "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {getAddress(customer)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {customer.phone ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/admin/customers/${customer.id}`)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteCustomer(customer)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog with text confirmation */}
      <ConfirmActionDialog
        open={!!deleteCustomer}
        onOpenChange={(open) => !open && setDeleteCustomer(null)}
        onConfirm={handleDelete}
        title="Kunde löschen?"
        description={`Der Kunde "${deleteCustomer ? getDisplayName(deleteCustomer) : ""}" und alle zugehörigen Daten werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText={isDeleting ? "Wird gelöscht..." : "Löschen"}
        confirmPhrase="LÖSCHEN"
        destructive
      />
    </div>
  );
};

export default Customers;
