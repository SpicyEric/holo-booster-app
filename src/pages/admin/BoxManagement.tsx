import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Search, RefreshCw, Package, Check, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";

interface Box {
  id: string;
  box_id: string;
  notes: string | null;
  created_at: string;
  assigned_customer?: {
    customer_id: string;
    customer_name: string;
    assigned_at: string;
  } | null;
}

const BoxManagement = () => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [filteredBoxes, setFilteredBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAssigned, setFilterAssigned] = useState<"all" | "assigned" | "available">("all");
  
  // New box form
  const [newBoxId, setNewBoxId] = useState("");
  const [newBoxNotes, setNewBoxNotes] = useState("");
  const [adding, setAdding] = useState(false);
  
  // Delete state
  const [deleteBox, setDeleteBox] = useState<Box | null>(null);

  const loadBoxes = async () => {
    try {
      setLoading(true);
      
      // Load all boxes
      const { data: boxesData, error: boxesError } = await supabase
        .from("boxes")
        .select("*")
        .order("created_at", { ascending: false });

      if (boxesError) throw boxesError;

      // Load customer_boxes assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("customer_boxes")
        .select(`
          box_id,
          customer_id,
          assigned_at,
          customers:customer_id (name)
        `);

      if (assignmentsError) throw assignmentsError;

      // Map assignments to boxes
      const boxesWithAssignments = (boxesData || []).map(box => {
        const assignment = assignmentsData?.find(a => a.box_id === box.id);
        return {
          ...box,
          assigned_customer: assignment ? {
            customer_id: assignment.customer_id,
            customer_name: (assignment.customers as any)?.name || "Unbekannt",
            assigned_at: assignment.assigned_at
          } : null
        };
      });

      setBoxes(boxesWithAssignments);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Boxen");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoxes();
  }, []);

  useEffect(() => {
    let filtered = [...boxes];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.box_id.toLowerCase().includes(term) ||
          b.notes?.toLowerCase().includes(term) ||
          b.assigned_customer?.customer_name.toLowerCase().includes(term)
      );
    }

    if (filterAssigned === "assigned") {
      filtered = filtered.filter((b) => b.assigned_customer);
    } else if (filterAssigned === "available") {
      filtered = filtered.filter((b) => !b.assigned_customer);
    }

    setFilteredBoxes(filtered);
  }, [boxes, searchTerm, filterAssigned]);

  const formatBoxId = (value: string) => {
    // Remove all non-alphanumeric characters
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    // Insert dashes every 5 characters
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join("-");
  };

  const handleNewBoxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBoxId(formatBoxId(e.target.value));
  };

  const addBox = async () => {
    const cleanId = newBoxId.replace(/-/g, "");
    if (cleanId.length !== 15) {
      toast.error("Box-ID muss genau 15 Zeichen haben (XXXXX-XXXXX-XXXXX)");
      return;
    }

    setAdding(true);
    try {
      // Check if box_id already exists
      const { data: existing } = await supabase
        .from("boxes")
        .select("id")
        .eq("box_id", newBoxId)
        .maybeSingle();

      if (existing) {
        toast.error("Diese Box-ID existiert bereits");
        return;
      }

      const { error } = await supabase
        .from("boxes")
        .insert({ 
          box_id: newBoxId, 
          notes: newBoxNotes.trim() || null 
        });

      if (error) throw error;

      toast.success("Box-ID erfolgreich hinzugefügt");
      setNewBoxId("");
      setNewBoxNotes("");
      loadBoxes();
    } catch (error: any) {
      toast.error("Fehler beim Hinzufügen der Box-ID");
      console.error(error);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBox) return;

    if (deleteBox.assigned_customer) {
      toast.error("Zugewiesene Boxen können nicht gelöscht werden");
      setDeleteBox(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("boxes")
        .delete()
        .eq("id", deleteBox.id);

      if (error) throw error;

      toast.success("Box-ID erfolgreich gelöscht");
      loadBoxes();
    } catch (error: any) {
      toast.error("Fehler beim Löschen der Box-ID");
      console.error(error);
    } finally {
      setDeleteBox(null);
    }
  };

  const availableCount = boxes.filter(b => !b.assigned_customer).length;
  const assignedCount = boxes.filter(b => b.assigned_customer).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            Box-ID Verwaltung
          </h1>
          <p className="text-xs text-muted-foreground">
            {boxes.length} Boxen ({availableCount} verfügbar, {assignedCount} zugewiesen)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadBoxes}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Aktualisieren
        </Button>
      </div>

      {/* Add new box */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Neue Box-ID hinzufügen</CardTitle>
          <CardDescription className="text-xs">
            Format: XXXXX-XXXXX-XXXXX (15 Zeichen, automatisch formatiert)
          </CardDescription>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex gap-2">
            <Input
              placeholder="XXXXX-XXXXX-XXXXX"
              value={newBoxId}
              onChange={handleNewBoxIdChange}
              className="font-mono w-48"
              maxLength={17}
            />
            <Input
              placeholder="Notiz (optional)"
              value={newBoxNotes}
              onChange={(e) => setNewBoxNotes(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={addBox} 
              disabled={adding || newBoxId.replace(/-/g, "").length !== 15}
              size="sm"
            >
              <Plus className="w-3 h-3 mr-1" />
              Hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
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
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant={filterAssigned === "all" ? "default" : "outline"}
            onClick={() => setFilterAssigned("all")}
            className="h-8 text-xs"
          >
            Alle
          </Button>
          <Button 
            size="sm" 
            variant={filterAssigned === "available" ? "default" : "outline"}
            onClick={() => setFilterAssigned("available")}
            className="h-8 text-xs"
          >
            Verfügbar ({availableCount})
          </Button>
          <Button 
            size="sm" 
            variant={filterAssigned === "assigned" ? "default" : "outline"}
            onClick={() => setFilterAssigned("assigned")}
            className="h-8 text-xs"
          >
            Zugewiesen ({assignedCount})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Laden...
          </div>
        ) : filteredBoxes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {boxes.length === 0 
              ? "Noch keine Box-IDs angelegt" 
              : "Keine Ergebnisse"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-8 text-xs font-semibold">Box-ID</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Status</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Zugewiesen an</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Notiz</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Erstellt</TableHead>
                <TableHead className="h-8 text-xs font-semibold w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoxes.map((box) => (
                <TableRow key={box.id}>
                  <TableCell className="py-2 font-mono text-sm font-medium">
                    {box.box_id}
                  </TableCell>
                  <TableCell className="py-2">
                    {box.assigned_customer ? (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="w-3 h-3" />
                        Zugewiesen
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                        Verfügbar
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    {box.assigned_customer ? (
                      <div>
                        <div className="font-medium">{box.assigned_customer.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(box.assigned_customer.assigned_at).toLocaleDateString("de-DE")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {box.notes || "—"}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {new Date(box.created_at).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="py-2">
                    {!box.assigned_customer && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteBox(box)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmActionDialog
        open={!!deleteBox}
        onOpenChange={(open) => !open && setDeleteBox(null)}
        onConfirm={handleDelete}
        title="Box-ID löschen?"
        description={`Die Box-ID "${deleteBox?.box_id}" wird dauerhaft gelöscht.`}
        confirmText="Löschen"
        confirmPhrase="LÖSCHEN"
        destructive
      />
    </div>
  );
};

export default BoxManagement;
