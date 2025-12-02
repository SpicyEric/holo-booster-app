import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appSupabase } from "@/integrations/app-supabase/client";
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

interface Merchant {
  id: string;
  name: string;
  category: string | null;
  address: string;
  postal_code: string | null;
  city: string;
  phone_number: string | null;
  created_at: string;
}

const Customers = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [deleteMerchant, setDeleteMerchant] = useState<Merchant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const { data, error } = await appSupabase
        .from("merchants")
        .select("id, name, category, address, postal_code, city, phone_number, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMerchants((data as Merchant[]) || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Kunden");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [merchants, searchTerm, categoryFilter, sortBy]);

  const handleDelete = async () => {
    if (!deleteMerchant || isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Delete merchant directly from App-DB
      const { error } = await appSupabase
        .from("merchants")
        .delete()
        .eq("id", deleteMerchant.id);

      if (error) throw error;
      
      toast.success("Kunde erfolgreich gelöscht");
      // Remove from local state immediately
      setMerchants(prev => prev.filter(m => m.id !== deleteMerchant.id));
    } catch (error: any) {
      toast.error("Fehler beim Löschen des Kunden: " + error.message);
      console.error(error);
    } finally {
      setIsDeleting(false);
      setDeleteMerchant(null);
    }
  };

  const applyFilters = () => {
    let filtered = [...merchants];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(term) ||
          m.city?.toLowerCase().includes(term) ||
          m.category?.toLowerCase().includes(term) ||
          m.phone_number?.includes(term) ||
          m.address?.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((m) => m.category === categoryFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "");
        default:
          return 0;
      }
    });

    setFilteredMerchants(filtered);
  };

  const categories = [...new Set(merchants.map(m => m.category).filter(Boolean))];

  const getAddress = (merchant: Merchant) => {
    const parts = [merchant.postal_code, merchant.city].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  return (
    <div className="space-y-3">
      {/* Header - compact */}
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h1 className="text-xl font-semibold">Kundenverwaltung</h1>
          <p className="text-xs text-muted-foreground">
            {filteredMerchants.length} von {merchants.length} Kunden
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadMerchants}>
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
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-[150px] text-sm">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
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
        ) : filteredMerchants.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {merchants.length === 0 
              ? "Noch keine Kunden angelegt" 
              : "Keine Ergebnisse"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-8 text-xs font-semibold">Firma</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Kategorie</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Adresse</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Telefon</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Angelegt</TableHead>
                <TableHead className="h-8 text-xs font-semibold w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchants.map((merchant) => (
                <TableRow 
                  key={merchant.id} 
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => navigate(`/admin/customers/${merchant.id}`)}
                >
                  <TableCell className="py-2">
                    <div className="font-medium text-sm">{merchant.name}</div>
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {merchant.category || "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {getAddress(merchant)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {merchant.phone_number ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {merchant.phone_number}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {new Date(merchant.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/admin/customers/${merchant.id}`)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteMerchant(merchant)}
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
        open={!!deleteMerchant}
        onOpenChange={(open) => !open && setDeleteMerchant(null)}
        onConfirm={handleDelete}
        title="Kunde löschen?"
        description={`Der Kunde "${deleteMerchant?.name || ""}" und alle zugehörigen Daten werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText={isDeleting ? "Wird gelöscht..." : "Löschen"}
        confirmPhrase="LÖSCHEN"
        destructive
      />
    </div>
  );
};

export default Customers;
