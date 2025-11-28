import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { appSupabase } from "@/integrations/app-supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Edit, Search, Trash2, RefreshCw, Store } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Merchant aus der App-DB (eloyo)
interface Merchant {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone_number: string | null;
  website: string | null;
  owner_user_id: string | null;
  created_at: string;
}

const Customers = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [deleteMerchantId, setDeleteMerchantId] = useState<string | null>(null);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const { data, error } = await appSupabase
        .from("merchants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMerchants(data || []);
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
    if (!deleteMerchantId) return;
    
    try {
      const { error } = await appSupabase
        .from("merchants")
        .delete()
        .eq("id", deleteMerchantId);

      if (error) throw error;
      
      toast.success("Kunde erfolgreich gelöscht");
      loadMerchants();
    } catch (error: any) {
      toast.error("Fehler beim Löschen des Kunden");
      console.error(error);
    } finally {
      setDeleteMerchantId(null);
    }
  };

  const applyFilters = () => {
    let filtered = [...merchants];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.city?.toLowerCase().includes(term) ||
          m.category?.toLowerCase().includes(term) ||
          m.address?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((m) => m.category === categoryFilter);
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

    setFilteredMerchants(filtered);
  };

  // Get unique categories for filter
  const categories = [...new Set(merchants.map(m => m.category).filter(Boolean))];

  const getCategoryBadge = (category: string | null) => {
    if (!category) return <Badge variant="outline">Keine Kategorie</Badge>;
    return <Badge variant="secondary">{category}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Kundenverwaltung
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredMerchants.length} {filteredMerchants.length === 1 ? "Kunde" : "Kunden"}
            {searchTerm || categoryFilter !== "all" 
              ? ` (gefiltert von ${merchants.length} gesamt)` 
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadMerchants}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Aktualisieren
          </Button>
          <GradientButton
            onClick={() => navigate("/admin/checkout")}
          >
            Kunde abschließen
          </GradientButton>
        </div>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Name, Stadt oder Adresse suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Kategorie filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
              ))}
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
        ) : filteredMerchants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {merchants.length === 0 
                ? "Noch keine Kunden angelegt" 
                : "Keine Kunden gefunden mit den aktuellen Filtern"}
            </p>
            {merchants.length === 0 && (
              <GradientButton
                onClick={() => navigate("/admin/checkout")}
              >
                Ersten Kunden abschließen
              </GradientButton>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Stadt</TableHead>
                <TableHead>Angelegt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {merchant.logo_url ? (
                        <img 
                          src={merchant.logo_url} 
                          alt={merchant.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Store className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{merchant.name}</p>
                        {merchant.address && (
                          <p className="text-sm text-muted-foreground">{merchant.address}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getCategoryBadge(merchant.category)}</TableCell>
                  <TableCell>{merchant.city || "—"}</TableCell>
                  <TableCell>
                    {new Date(merchant.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/customers/${merchant.id}`)}
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteMerchantId(merchant.id)}
                        title="Löschen"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteMerchantId} onOpenChange={(open) => !open && setDeleteMerchantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Der Kunde und alle zugehörigen Daten werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;