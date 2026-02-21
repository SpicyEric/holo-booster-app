import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Search, RefreshCw, Package, Check, Nfc, Loader2, Shuffle, Shield } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STAMP_PRESETS = {
  standard_3: { label: "Standard (3 Stempel: Grün, Blau, Rot)", stamps: 3 },
  standard_5: { label: "Erweitert (5 Stempel)", stamps: 5 },
  custom: { label: "Individuell", stamps: 0 },
};

const STAMP_COLORS = [
  { value: "grün", label: "Grün", colorClass: "bg-green-500" },
  { value: "blau", label: "Blau", colorClass: "bg-blue-500" },
  { value: "rot", label: "Rot", colorClass: "bg-red-500" },
];

interface Box {
  id: string;
  box_id: string;
  notes: string | null;
  stamp_preset: string;
  created_at: string;
  assigned_customer?: {
    customer_id: string;
    customer_name: string;
    assigned_at: string;
  } | null;
}

interface RegisteredStamp {
  id: string;
  stamp_color: string;
  hardware_uid: string | null;
  chip_uid: string;
  points_value: number;
}

// Generate random Box-ID in format XXXXX-XXXXX-XXXXX
const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789'; // No I, L, O, 0
function generateBoxId(): string {
  const parts: string[] = [];
  for (let p = 0; p < 3; p++) {
    let segment = '';
    for (let i = 0; i < 5; i++) {
      segment += VALID_CHARS.charAt(Math.floor(Math.random() * VALID_CHARS.length));
    }
    parts.push(segment);
  }
  return parts.join('-');
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
  const [newBoxPreset, setNewBoxPreset] = useState("standard_3");
  const [adding, setAdding] = useState(false);
  
  // Delete state
  const [deleteBox, setDeleteBox] = useState<Box | null>(null);

  // Stamp registration dialog
  const [stampDialogOpen, setStampDialogOpen] = useState(false);
  const [stampDialogBox, setStampDialogBox] = useState<Box | null>(null);
  const [registeredStamps, setRegisteredStamps] = useState<RegisteredStamp[]>([]);
  const [loadingStamps, setLoadingStamps] = useState(false);
  const [scanningStampColor, setScanningStampColor] = useState<string | null>(null);
  const [webNfcSupported, setWebNfcSupported] = useState(false);

  useEffect(() => {
    setWebNfcSupported('NDEFReader' in window);
  }, []);

  const loadBoxes = async () => {
    try {
      setLoading(true);
      
      const { data: boxesData, error: boxesError } = await supabase
        .from("boxes")
        .select("*")
        .order("created_at", { ascending: false });

      if (boxesError) throw boxesError;

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("customer_boxes")
        .select(`
          box_id,
          customer_id,
          assigned_at,
          customers:customer_id (name)
        `);

      if (assignmentsError) throw assignmentsError;

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
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join("-");
  };

  const handleNewBoxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBoxId(formatBoxId(e.target.value));
  };

  const handleGenerateBoxId = () => {
    setNewBoxId(generateBoxId());
  };

  const addBox = async () => {
    const cleanId = newBoxId.replace(/-/g, "");
    if (cleanId.length !== 15) {
      toast.error("Box-ID muss genau 15 Zeichen haben (XXXXX-XXXXX-XXXXX)");
      return;
    }

    setAdding(true);
    try {
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
          notes: newBoxNotes.trim() || null,
          stamp_preset: newBoxPreset
        });

      if (error) throw error;

      toast.success("Box-ID erfolgreich hinzugefügt");
      setNewBoxId("");
      setNewBoxNotes("");
      setNewBoxPreset("standard_3");
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

  // === Stamp Registration Logic ===

  const openStampDialog = async (box: Box) => {
    setStampDialogBox(box);
    setStampDialogOpen(true);
    await loadRegisteredStamps(box);
  };

  const loadRegisteredStamps = async (box: Box) => {
    setLoadingStamps(true);
    try {
      // Find NFC chips that belong to this box (via merchant or by chip_uid containing box_id)
      const { data, error } = await supabase
        .from("nfc_chips")
        .select("id, stamp_color, hardware_uid, chip_uid, points_value")
        .eq("chip_uid", box.box_id);

      if (error) throw error;
      setRegisteredStamps(data || []);
    } catch (error) {
      console.error("Error loading stamps:", error);
      setRegisteredStamps([]);
    } finally {
      setLoadingStamps(false);
    }
  };

  const startStampRegistration = async (color: string) => {
    if (!stampDialogBox) return;
    if (!webNfcSupported) {
      toast.error("Web NFC ist in diesem Browser nicht verfügbar. Bitte nutze Chrome auf einem Android-Gerät.");
      return;
    }

    setScanningStampColor(color);
    const boxId = stampDialogBox.box_id;
    const ndefText = `${boxId}:${color}`;

    try {
      const ndef = new (window as any).NDEFReader();
      const abortController = new AbortController();

      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        abortController.abort();
        setScanningStampColor(null);
        toast.error("NFC-Scan Timeout. Bitte erneut versuchen.");
      }, 30000);

      await ndef.scan({ signal: abortController.signal });

      const handleReading = async ({ serialNumber }: { serialNumber: string }) => {
        clearTimeout(timeout);
        // Remove event listener immediately to prevent duplicate fires
        ndef.removeEventListener('reading', handleReading);

        const hardwareUid = serialNumber || null;
        console.log('[Admin NFC] Tag detected, serial:', hardwareUid);

        // Write the NDEF text to the chip using the SAME reader instance
        let writeSuccess = false;
        try {
          await ndef.write({
            records: [{ recordType: "text", data: ndefText, lang: "de" }]
          });
          console.log('[Admin NFC] Written to chip:', ndefText);
          toast.success(`NFC-Chip beschrieben: ${ndefText}`);
          writeSuccess = true;
        } catch (writeError: any) {
          console.error('[Admin NFC] Write failed:', writeError);
          toast.error("Chip konnte nicht beschrieben werden. Halte den Stempel länger ans Handy und versuche es erneut.");
        }

        // Save to database
        try {
          // Check if stamp already exists for this box + color
          const { data: existing } = await supabase
            .from("nfc_chips")
            .select("id")
            .eq("chip_uid", boxId)
            .eq("stamp_color", color)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("nfc_chips")
              .update({ hardware_uid: hardwareUid })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("nfc_chips")
              .insert({
                chip_uid: boxId,
                stamp_color: color,
                stamp_name: color.charAt(0).toUpperCase() + color.slice(1),
                hardware_uid: hardwareUid,
                points_value: color === 'grün' ? 1 : color === 'blau' ? 2 : 3,
                is_active: true,
              });
          }

          toast.success(`Stempel "${color}" registriert${hardwareUid ? ' – UID: ' + hardwareUid : ''}`);
          
          // Force immediate UI update by directly updating local state
          setRegisteredStamps(prev => {
            const filtered = prev.filter(s => s.stamp_color !== color);
            return [...filtered, {
              id: existing?.id || 'temp-' + Date.now(),
              stamp_color: color,
              hardware_uid: hardwareUid,
              chip_uid: boxId,
              points_value: color === 'grün' ? 1 : color === 'blau' ? 2 : 3,
            }];
          });
        } catch (dbError: any) {
          console.error('[Admin NFC] DB save error:', dbError);
          toast.error("Fehler beim Speichern in der Datenbank");
        }

        setScanningStampColor(null);
        // Abort the scan session after successful read
        try { abortController.abort(); } catch (_) {}
      };

      ndef.addEventListener('reading', handleReading);

    } catch (error: any) {
      console.error('[Admin NFC] Scan error:', error);
      setScanningStampColor(null);
      
      if (error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') {
        toast.error("NFC-Berechtigung verweigert. Bitte erlaube NFC in den Browser-Einstellungen.");
      } else {
        toast.error("NFC-Fehler: " + (error.message || "Unbekannter Fehler"));
      }
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
          <CardTitle className="text-sm">Neue Box-ID erstellen</CardTitle>
          <CardDescription className="text-xs">
            Format: XXXXX-XXXXX-XXXXX – automatisch generieren oder manuell eingeben
          </CardDescription>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Box-ID</Label>
              <div className="flex gap-1">
                <Input
                  placeholder="XXXXX-XXXXX-XXXXX"
                  value={newBoxId}
                  onChange={handleNewBoxIdChange}
                  className="font-mono w-48"
                  maxLength={17}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleGenerateBoxId}
                  title="Zufällig generieren"
                  type="button"
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stempel-Konfiguration</Label>
              <Select value={newBoxPreset} onValueChange={setNewBoxPreset}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAMP_PRESETS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-32">
              <Label className="text-xs">Notiz (optional)</Label>
              <Input
                placeholder="z.B. Bestellung #123"
                value={newBoxNotes}
                onChange={(e) => setNewBoxNotes(e.target.value)}
              />
            </div>
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
                <TableHead className="h-8 text-xs font-semibold">Stempel</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Status</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Zugewiesen an</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Notiz</TableHead>
                <TableHead className="h-8 text-xs font-semibold">Erstellt</TableHead>
                <TableHead className="h-8 text-xs font-semibold w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoxes.map((box) => (
                <TableRow key={box.id}>
                  <TableCell className="py-2 font-mono text-sm font-medium">
                    {box.box_id}
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    <Badge variant="outline">
                      {STAMP_PRESETS[box.stamp_preset as keyof typeof STAMP_PRESETS]?.stamps || 3} Stempel
                    </Badge>
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
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Stempel registrieren"
                        onClick={() => openStampDialog(box)}
                      >
                        <Nfc className="h-3 w-3" />
                      </Button>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Stamp Registration Dialog */}
      <Dialog open={stampDialogOpen} onOpenChange={setStampDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Nfc className="h-5 w-5" />
              Stempel registrieren
            </DialogTitle>
            <DialogDescription>
              Box: <span className="font-mono font-semibold">{stampDialogBox?.box_id}</span>
              <br />
              Halte jeden NFC-Chip an dein Handy, um ihn zu registrieren und automatisch zu beschreiben.
            </DialogDescription>
          </DialogHeader>

          {!webNfcSupported && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              ⚠️ Web NFC ist in diesem Browser nicht verfügbar. Bitte öffne diese Seite in <strong>Chrome auf einem Android-Gerät</strong>.
            </div>
          )}

          <div className="space-y-3">
            {STAMP_COLORS.map((stampColor) => {
              const registered = registeredStamps.find(s => s.stamp_color === stampColor.value);
              const isScanning = scanningStampColor === stampColor.value;

              return (
                <div key={stampColor.value} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`w-4 h-4 rounded-full ${stampColor.colorClass}`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{stampColor.label}</div>
                    {registered ? (
                      <div className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-green-600" />
                          {registered.hardware_uid 
                            ? `UID: ${registered.hardware_uid}` 
                            : 'Registriert (ohne Hardware-UID)'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Nicht registriert</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={registered ? "outline" : "default"}
                    disabled={isScanning || !webNfcSupported}
                    onClick={() => startStampRegistration(stampColor.value)}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Scannen...
                      </>
                    ) : registered ? (
                      'Erneut scannen'
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        Registrieren
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {loadingStamps && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
