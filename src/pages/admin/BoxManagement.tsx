import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Search, RefreshCw, Package, Check, Nfc, Loader2, Shuffle, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  hasActivity?: boolean;
}

interface RegisteredStamp {
  id: string;
  stamp_color: string;
  hardware_uid: string | null;
  chip_uid: string;
  points_value: number;
}

const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';
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
  const [newBoxId, setNewBoxId] = useState("");
  const [newBoxNotes, setNewBoxNotes] = useState("");
  const [newBoxPreset, setNewBoxPreset] = useState("standard_3");
  const [adding, setAdding] = useState(false);
  const [deleteBox, setDeleteBox] = useState<Box | null>(null);
  const [stampDialogOpen, setStampDialogOpen] = useState(false);
  const [stampDialogBox, setStampDialogBox] = useState<Box | null>(null);
  const [registeredStamps, setRegisteredStamps] = useState<RegisteredStamp[]>([]);
  const [loadingStamps, setLoadingStamps] = useState(false);
  const [scanningStampColor, setScanningStampColor] = useState<string | null>(null);
  const [webNfcSupported, setWebNfcSupported] = useState(false);

  useEffect(() => { setWebNfcSupported('NDEFReader' in window); }, []);

  const loadBoxes = async () => {
    try {
      setLoading(true);
      const { data: boxesData, error: boxesError } = await supabase
        .from("boxes").select("*").order("created_at", { ascending: false });
      if (boxesError) throw boxesError;

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("customer_boxes").select(`box_id, customer_id, assigned_at, customers:customer_id (name)`);
      if (assignmentsError) throw assignmentsError;

      // Check which boxes have NFC activity
      const boxIds = (boxesData || []).map((b) => b.box_id);
      const { data: nfcChips } = await supabase
        .from("nfc_chips").select("chip_uid").in("chip_uid", boxIds);
      const activeBoxIds = new Set((nfcChips || []).map((c: any) => c.chip_uid));

      // Check for stamp transactions
      const assignedCustomerIds = (assignmentsData || []).map((a) => a.customer_id);
      const { data: transactions } = assignedCustomerIds.length > 0
        ? await supabase.from("point_transactions").select("merchant_customer_id").eq("transaction_type", "nfc_stamp").in("merchant_customer_id", assignedCustomerIds).limit(500)
        : { data: [] };
      const customersWithActivity = new Set((transactions || []).map((t: any) => t.merchant_customer_id));

      const boxesWithAssignments = (boxesData || []).map((box) => {
        const assignment = assignmentsData?.find((a) => a.box_id === box.id);
        const hasActivity = assignment
          ? customersWithActivity.has(assignment.customer_id) || activeBoxIds.has(box.box_id)
          : false;
        return {
          ...box,
          assigned_customer: assignment ? {
            customer_id: assignment.customer_id,
            customer_name: (assignment.customers as any)?.name || "Unbekannt",
            assigned_at: assignment.assigned_at,
          } : null,
          hasActivity,
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

  useEffect(() => { loadBoxes(); }, []);

  useEffect(() => {
    let filtered = [...boxes];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((b) =>
        b.box_id.toLowerCase().includes(term) ||
        b.notes?.toLowerCase().includes(term) ||
        b.assigned_customer?.customer_name.toLowerCase().includes(term)
      );
    }
    if (filterAssigned === "assigned") filtered = filtered.filter((b) => b.assigned_customer);
    else if (filterAssigned === "available") filtered = filtered.filter((b) => !b.assigned_customer);
    setFilteredBoxes(filtered);
  }, [boxes, searchTerm, filterAssigned]);

  const formatBoxId = (value: string) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) parts.push(clean.slice(i, i + 5));
    return parts.join("-");
  };

  const addBox = async () => {
    const cleanId = newBoxId.replace(/-/g, "");
    if (cleanId.length !== 15) { toast.error("Box-ID muss genau 15 Zeichen haben"); return; }
    setAdding(true);
    try {
      const { data: existing } = await supabase.from("boxes").select("id").eq("box_id", newBoxId).maybeSingle();
      if (existing) { toast.error("Diese Box-ID existiert bereits"); return; }
      const { error } = await supabase.from("boxes").insert({ box_id: newBoxId, notes: newBoxNotes.trim() || null, stamp_preset: newBoxPreset });
      if (error) throw error;
      toast.success("Box-ID erfolgreich hinzugefügt");
      setNewBoxId(""); setNewBoxNotes(""); setNewBoxPreset("standard_3");
      loadBoxes();
    } catch (error: any) {
      toast.error("Fehler beim Hinzufügen");
    } finally { setAdding(false); }
  };

  const handleDelete = async () => {
    if (!deleteBox) return;
    if (deleteBox.assigned_customer) { toast.error("Zugewiesene Boxen können nicht gelöscht werden"); setDeleteBox(null); return; }
    try {
      const { error } = await supabase.from("boxes").delete().eq("id", deleteBox.id);
      if (error) throw error;
      toast.success("Box-ID gelöscht");
      loadBoxes();
    } catch (error: any) {
      toast.error("Fehler beim Löschen");
    } finally { setDeleteBox(null); }
  };

  const openStampDialog = async (box: Box) => {
    setStampDialogBox(box);
    setStampDialogOpen(true);
    setLoadingStamps(true);
    try {
      const { data } = await supabase.from("nfc_chips").select("id, stamp_color, hardware_uid, chip_uid, points_value").eq("chip_uid", box.box_id);
      setRegisteredStamps(data || []);
    } catch (e) { setRegisteredStamps([]); }
    finally { setLoadingStamps(false); }
  };

  const startStampRegistration = async (color: string) => {
    if (!stampDialogBox || !webNfcSupported) {
      toast.error("Web NFC nicht verfügbar");
      return;
    }
    setScanningStampColor(color);
    const boxId = stampDialogBox.box_id;
    const ndefText = `${boxId}:${color}`;
    try {
      const ndef = new (window as any).NDEFReader();
      const abortController = new AbortController();
      const timeout = setTimeout(() => { abortController.abort(); setScanningStampColor(null); toast.error("NFC-Scan Timeout"); }, 30000);
      await ndef.scan({ signal: abortController.signal });
      const handleReading = async ({ serialNumber }: { serialNumber: string }) => {
        clearTimeout(timeout);
        ndef.removeEventListener('reading', handleReading);
        const hardwareUid = serialNumber || null;
        try {
          await ndef.write({ records: [{ recordType: "text", data: ndefText, lang: "de" }] });
          toast.success(`NFC-Chip beschrieben: ${ndefText}`);
        } catch { toast.error("Chip konnte nicht beschrieben werden"); }
        try {
          const { data: existing } = await supabase.from("nfc_chips").select("id").eq("chip_uid", boxId).eq("stamp_color", color).maybeSingle();
          if (existing) { await supabase.from("nfc_chips").update({ hardware_uid: hardwareUid }).eq("id", existing.id); }
          else { await supabase.from("nfc_chips").insert({ chip_uid: boxId, stamp_color: color, stamp_name: color.charAt(0).toUpperCase() + color.slice(1), hardware_uid: hardwareUid, points_value: color === 'grün' ? 1 : color === 'blau' ? 2 : 3, is_active: true }); }
          toast.success(`Stempel "${color}" registriert`);
          setRegisteredStamps(prev => {
            const filtered = prev.filter(s => s.stamp_color !== color);
            return [...filtered, { id: existing?.id || 'temp-' + Date.now(), stamp_color: color, hardware_uid: hardwareUid, chip_uid: boxId, points_value: color === 'grün' ? 1 : color === 'blau' ? 2 : 3 }];
          });
        } catch { toast.error("DB Fehler"); }
        setScanningStampColor(null);
        try { abortController.abort(); } catch {}
      };
      ndef.addEventListener('reading', handleReading);
    } catch (error: any) {
      setScanningStampColor(null);
      if (error.name === 'AbortError') return;
      toast.error("NFC-Fehler: " + (error.message || "Unbekannt"));
    }
  };

  const getBoxStatus = (box: Box): { label: string; color: string; dotColor: string } => {
    if (box.assigned_customer && box.hasActivity) return { label: "Aktiv genutzt", color: "bg-green-50 text-green-700 border-green-200", dotColor: "bg-green-500" };
    if (box.assigned_customer && !box.hasActivity) return { label: "Zugewiesen", color: "bg-yellow-50 text-yellow-700 border-yellow-200", dotColor: "bg-yellow-500" };
    if (!box.assigned_customer) return { label: "Verfügbar", color: "bg-blue-50 text-blue-700 border-blue-200", dotColor: "bg-blue-500" };
    return { label: "Unbekannt", color: "bg-gray-50 text-gray-600 border-gray-200", dotColor: "bg-gray-400" };
  };

  const availableCount = boxes.filter(b => !b.assigned_customer).length;
  const assignedCount = boxes.filter(b => b.assigned_customer).length;
  const activeCount = boxes.filter(b => b.assigned_customer && b.hasActivity).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" /> Box-ID Verwaltung
          </h1>
          <p className="text-xs text-muted-foreground">
            {boxes.length} Boxen · <span className="text-green-600">{activeCount} aktiv</span> · <span className="text-yellow-600">{assignedCount - activeCount} zugewiesen</span> · <span className="text-blue-600">{availableCount} verfügbar</span>
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadBoxes}><RefreshCw className="w-3 h-3 mr-1" />Aktualisieren</Button>
      </div>

      {/* Low box alert */}
      {availableCount < 3 && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium ${availableCount === 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          <Package className="w-4 h-4" />
          {availableCount === 0 ? "Keine Box-IDs mehr verfügbar!" : `Nur noch ${availableCount} Box-ID${availableCount > 1 ? "s" : ""} verfügbar`}
        </div>
      )}

      {/* Add new box */}
      <Card className="bg-white rounded-xl border-border/30">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Neue Box-ID erstellen</CardTitle>
          <CardDescription className="text-xs">Format: XXXXX-XXXXX-XXXXX</CardDescription>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Box-ID</Label>
              <div className="flex gap-1">
                <Input placeholder="XXXXX-XXXXX-XXXXX" value={newBoxId} onChange={(e) => setNewBoxId(formatBoxId(e.target.value))} className="font-mono w-48" maxLength={17} />
                <Button variant="outline" size="icon" onClick={() => setNewBoxId(generateBoxId())} title="Zufällig"><Shuffle className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stempel-Konfiguration</Label>
              <Select value={newBoxPreset} onValueChange={setNewBoxPreset}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STAMP_PRESETS).map(([key, { label }]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-32">
              <Label className="text-xs">Notiz (optional)</Label>
              <Input placeholder="z.B. Bestellung #123" value={newBoxNotes} onChange={(e) => setNewBoxNotes(e.target.value)} />
            </div>
            <Button onClick={addBox} disabled={adding || newBoxId.replace(/-/g, "").length !== 15} size="sm">
              <Plus className="w-3 h-3 mr-1" />Hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 items-center bg-white p-2 rounded-xl border border-border/30">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pl-8 text-sm" />
        </div>
        <Select value={filterAssigned} onValueChange={(v) => setFilterAssigned(v as any)}>
          <SelectTrigger className="h-8 w-[160px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="assigned">Zugewiesen</SelectItem>
            <SelectItem value="available">Verfügbar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border/30 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Laden...</div>
        ) : filteredBoxes.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Keine Boxen gefunden</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-9 text-xs font-semibold">Status</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Box-ID</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Zugewiesen an</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Preset</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Notiz</TableHead>
                <TableHead className="h-9 text-xs font-semibold">Erstellt</TableHead>
                <TableHead className="h-9 text-xs font-semibold w-24">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoxes.map((box) => {
                const status = getBoxStatus(box);
                return (
                  <TableRow key={box.id} className="hover:bg-[hsl(262,40%,97%)]">
                    <TableCell className="py-2">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${status.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                        {status.label}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 font-mono text-sm">{box.box_id}</TableCell>
                    <TableCell className="py-2 text-sm">
                      {box.assigned_customer ? (
                        <span className="font-medium">{box.assigned_customer.customer_name}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {STAMP_PRESETS[box.stamp_preset as keyof typeof STAMP_PRESETS]?.label?.split(" ")[0] || box.stamp_preset}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground truncate max-w-[120px]">{box.notes || "—"}</TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {new Date(box.created_at).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStampDialog(box)} title="NFC Stempel">
                          <Nfc className="h-3.5 w-3.5" />
                        </Button>
                        {!box.assigned_customer && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteBox(box)} title="Löschen">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Stamp Registration Dialog */}
      <Dialog open={stampDialogOpen} onOpenChange={setStampDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> NFC-Stempel: {stampDialogBox?.box_id}</DialogTitle>
            <DialogDescription>Registriere die NFC-Stempel für diese Box</DialogDescription>
          </DialogHeader>
          {loadingStamps ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {STAMP_COLORS.map(({ value, label, colorClass }) => {
                const registered = registeredStamps.find(s => s.stamp_color === value);
                const isScanning = scanningStampColor === value;
                return (
                  <div key={value} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full ${colorClass}`} />
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        {registered && <p className="text-[10px] text-muted-foreground">UID: {registered.hardware_uid || "Nicht gesetzt"}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {registered && <Check className="w-4 h-4 text-green-500" />}
                      <Button size="sm" variant={registered ? "outline" : "default"} disabled={isScanning} onClick={() => startStampRegistration(value)}>
                        {isScanning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Scanne...</> : registered ? "Neu scannen" : "Registrieren"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
