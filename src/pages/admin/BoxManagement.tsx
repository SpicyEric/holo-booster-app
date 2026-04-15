import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Search, RefreshCw, Package, Check, Nfc, Loader2, Shuffle, Shield, Info, ChevronDown } from "lucide-react";
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';

function generateBoxId5(): string {
  let id = '';
  for (let i = 0; i < 5; i++) id += VALID_CHARS.charAt(Math.floor(Math.random() * VALID_CHARS.length));
  return id;
}

function generateStempelId(): string {
  const parts: string[] = [];
  for (let p = 0; p < 3; p++) {
    let segment = '';
    for (let i = 0; i < 5; i++) segment += VALID_CHARS.charAt(Math.floor(Math.random() * VALID_CHARS.length));
    parts.push(segment);
  }
  return parts.join('-');
}

const STAMP_COLORS = [
  { value: "grün", label: "Grün", colorClass: "bg-green-500" },
  { value: "blau", label: "Blau", colorClass: "bg-blue-500" },
  { value: "rot", label: "Rot", colorClass: "bg-red-500" },
];

const BOX_STATUS_BADGES: Record<string, { label: string; color: string }> = {
  offen: { label: 'Offen', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  verfuegbar: { label: 'Verfügbar', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  versendet: { label: 'Versendet', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  abgeschlossen: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-700 border-green-200' },
  retourniert: { label: 'Retourniert', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  in_rechnung_gestellt: { label: 'In Rechnung', color: 'bg-red-100 text-red-700 border-red-200' },
};

const STEMPEL_STATUS_BADGES: Record<string, { label: string; color: string }> = {
  offen: { label: 'Offen', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  verfuegbar: { label: 'Verfügbar', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  zugewiesen: { label: 'Zugewiesen', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  aktiv_genutzt: { label: 'Aktiv genutzt', color: 'bg-green-100 text-green-700 border-green-200' },
  gekuendigt: { label: 'Gekündigt', color: 'bg-red-100 text-red-600 border-red-200' },
};

interface BoxRow {
  id: string;
  box_id: string;
  stempel_id: string | null;
  status: string;
  created_at: string;
  // derived
  stempel_status: string;
  assigned_customer_name: string | null;
  has_activity: boolean;
  customer_status: string | null;
}

interface RegisteredStamp {
  id: string;
  stamp_color: string;
  hardware_uid: string | null;
  chip_uid: string;
  points_value: number;
}

const BoxManagement = () => {
  const [rows, setRows] = useState<BoxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [deleteRow, setDeleteRow] = useState<BoxRow | null>(null);

  // NFC stamp dialog
  const [stampDialogOpen, setStampDialogOpen] = useState(false);
  const [stampDialogRow, setStampDialogRow] = useState<BoxRow | null>(null);
  const [registeredStamps, setRegisteredStamps] = useState<RegisteredStamp[]>([]);
  const [loadingStamps, setLoadingStamps] = useState(false);
  const [scanningStampColor, setScanningStampColor] = useState<string | null>(null);
  const [webNfcSupported, setWebNfcSupported] = useState(false);

  // Detail dialog
  const [detailRow, setDetailRow] = useState<BoxRow | null>(null);
  const [detailStamps, setDetailStamps] = useState<RegisteredStamp[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { setWebNfcSupported('NDEFReader' in window); }, []);

  const loadRows = async () => {
    setLoading(true);
    try {
      // Load eloyo_boxes
      const { data: eloyoBoxes, error: eloyoErr } = await supabase
        .from("eloyo_boxes")
        .select("*")
        .order("created_at", { ascending: false });
      if (eloyoErr) throw eloyoErr;

      // Load boxes (stempel_ids) for cross-reference
      const stempelIds = (eloyoBoxes || []).map(b => b.stempel_id).filter(Boolean);
      const { data: boxesData } = stempelIds.length > 0
        ? await supabase.from("boxes").select("stamp_id").in("stamp_id", stempelIds)
        : { data: [] };
      const existingStempelIds = new Set((boxesData || []).map(b => b.stamp_id));

      // Load customer_boxes assignments to derive stempel_status
      const { data: assignments } = stempelIds.length > 0
        ? await supabase.from("customer_boxes").select("box_id, customer_id, customers:customer_id (name, active, status)").in("box_id", (eloyoBoxes || []).map(b => b.id))
        : { data: [] };

      // Also check via boxes table (stamp_id -> boxes.id -> customer_boxes.box_id)
      const { data: boxesWithIds } = stempelIds.length > 0
        ? await supabase.from("boxes").select("id, stamp_id").in("stamp_id", stempelIds)
        : { data: [] };
      const stampIdToBoxUuid = new Map((boxesWithIds || []).map(b => [b.stamp_id, b.id]));

      const boxUuids = Array.from(stampIdToBoxUuid.values());
      const { data: stampAssignments } = boxUuids.length > 0
        ? await supabase.from("customer_boxes").select("box_id, customer_id, customers:customer_id (name, active, status)").in("box_id", boxUuids)
        : { data: [] };

      // NFC activity check
      const { data: nfcChips } = stempelIds.length > 0
        ? await supabase.from("nfc_chips").select("chip_uid").in("chip_uid", stempelIds)
        : { data: [] };
      const activeStempelIds = new Set((nfcChips || []).map((c: any) => c.chip_uid));

      const result: BoxRow[] = (eloyoBoxes || []).map(eb => {
        const stempelId = eb.stempel_id;
        const boxUuid = stempelId ? stampIdToBoxUuid.get(stempelId) : null;
        const assignment = boxUuid ? (stampAssignments || []).find(a => a.box_id === boxUuid) : null;
        const customerData = assignment?.customers as any;

        // Derive stempel_status
        let stempelStatus = 'offen';
        if (stempelId && existingStempelIds.has(stempelId)) {
          if (assignment) {
            if (customerData?.status === 'canceled') {
              stempelStatus = 'gekuendigt';
            } else if (activeStempelIds.has(stempelId)) {
              stempelStatus = 'aktiv_genutzt';
            } else {
              stempelStatus = 'zugewiesen';
            }
          } else {
            stempelStatus = 'verfuegbar';
          }
        }

        return {
          id: eb.id,
          box_id: eb.box_id,
          stempel_id: stempelId,
          status: eb.status,
          created_at: eb.created_at,
          stempel_status: stempelStatus,
          assigned_customer_name: customerData?.name || null,
          has_activity: stempelId ? activeStempelIds.has(stempelId) : false,
          customer_status: customerData?.status || null,
        };
      });

      setRows(result);
    } catch (e: any) {
      console.error(e);
      toast.error("Fehler beim Laden der Box-IDs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRows(); }, []);

  const filtered = rows.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return r.box_id.toLowerCase().includes(term) || (r.stempel_id?.toLowerCase().includes(term) ?? false) || (r.assigned_customer_name?.toLowerCase().includes(term) ?? false);
    }
    return true;
  });

  const handleCreate = async () => {
    setAdding(true);
    try {
      const boxId = generateBoxId5();
      const stempelId = generateStempelId();

      // Check uniqueness
      const { data: existingBox } = await supabase.from("eloyo_boxes").select("id").eq("box_id", boxId).maybeSingle();
      if (existingBox) { toast.error("Box-ID Kollision – bitte erneut versuchen"); setAdding(false); return; }

      const { data: existingStempel } = await supabase.from("boxes").select("id").eq("stamp_id", stempelId).maybeSingle();
      if (existingStempel) { toast.error("Stempel-ID Kollision – bitte erneut versuchen"); setAdding(false); return; }

      // Create in boxes table (stempel_id)
      const { error: boxesErr } = await supabase.from("boxes").insert({ stamp_id: stempelId, stamp_preset: "standard_3" });
      if (boxesErr) throw boxesErr;

      // Create in eloyo_boxes
      const { error: eloyoErr } = await supabase.from("eloyo_boxes").insert({
        box_id: boxId,
        stempel_id: stempelId,
        status: 'offen',
      });
      if (eloyoErr) throw eloyoErr;

      toast.success(`Box ${boxId} mit Stempel-ID ${stempelId} erstellt`);
      loadRows();
    } catch (e: any) {
      console.error(e);
      toast.error("Fehler beim Erstellen");
    } finally {
      setAdding(false);
    }
  };

  const handleStatusChange = async (row: BoxRow, newStatus: string) => {
    try {
      const { error } = await supabase.from("eloyo_boxes").update({ status: newStatus }).eq("id", row.id);
      if (error) throw error;
      toast.success(`Box-ID Status → ${BOX_STATUS_BADGES[newStatus]?.label || newStatus}`);
      loadRows();
    } catch (e: any) {
      toast.error("Fehler beim Status-Update");
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      // Delete eloyo_boxes entry
      const { error } = await supabase.from("eloyo_boxes").delete().eq("id", deleteRow.id);
      if (error) throw error;
      // Also delete boxes entry if exists
      if (deleteRow.stempel_id) {
        await supabase.from("boxes").delete().eq("stamp_id", deleteRow.stempel_id);
      }
      toast.success("Box gelöscht");
      loadRows();
    } catch (e: any) {
      toast.error("Fehler beim Löschen");
    } finally {
      setDeleteRow(null);
    }
  };

  const openStampDialog = async (row: BoxRow) => {
    if (!row.stempel_id) return;
    setStampDialogRow(row); setStampDialogOpen(true); setLoadingStamps(true);
    try {
      const { data } = await supabase.from("nfc_chips").select("id, stamp_color, hardware_uid, chip_uid, points_value").eq("chip_uid", row.stempel_id);
      setRegisteredStamps(data || []);
    } catch { setRegisteredStamps([]); }
    finally { setLoadingStamps(false); }
  };

  const openDetailDialog = async (row: BoxRow) => {
    setDetailRow(row); setLoadingDetail(true);
    try {
      if (row.stempel_id) {
        const { data } = await supabase.from("nfc_chips").select("id, stamp_color, hardware_uid, chip_uid, points_value").eq("chip_uid", row.stempel_id);
        setDetailStamps(data || []);
      } else {
        setDetailStamps([]);
      }
    } catch { setDetailStamps([]); }
    finally { setLoadingDetail(false); }
  };

  const startStampRegistration = async (color: string) => {
    if (!stampDialogRow?.stempel_id || !webNfcSupported) { toast.error("Web NFC nicht verfügbar"); return; }
    setScanningStampColor(color);
    const chipUid = stampDialogRow.stempel_id;
    const ndefText = `${chipUid}:${color}`;
    try {
      const ndef = new (window as any).NDEFReader();
      const abortController = new AbortController();
      const timeout = setTimeout(() => { abortController.abort(); setScanningStampColor(null); toast.error("NFC-Scan Timeout"); }, 30000);
      await ndef.scan({ signal: abortController.signal });
      const handleReading = async ({ serialNumber }: { serialNumber: string }) => {
        clearTimeout(timeout);
        ndef.removeEventListener('reading', handleReading);
        const hardwareUid = serialNumber ? serialNumber.toLowerCase() : null;
        try { await ndef.write({ records: [{ recordType: "text", data: ndefText, lang: "de" }] }); toast.success(`NFC-Chip beschrieben: ${ndefText}`); } catch { toast.error("Chip konnte nicht beschrieben werden"); }
        try {
          const { data: existing } = await supabase.from("nfc_chips").select("id").eq("chip_uid", chipUid).eq("stamp_color", color).maybeSingle();
          if (existing) { await supabase.from("nfc_chips").update({ hardware_uid: hardwareUid }).eq("id", existing.id); }
          else { await supabase.from("nfc_chips").insert({ chip_uid: chipUid, stamp_color: color, stamp_name: color.charAt(0).toUpperCase() + color.slice(1), hardware_uid: hardwareUid, points_value: color === 'grün' ? 1 : color === 'blau' ? 2 : 3, is_active: true }); }
          toast.success(`Stempel "${color}" registriert`);
          setRegisteredStamps(prev => {
            const filtered = prev.filter(s => s.stamp_color !== color);
            return [...filtered, { id: existing?.id || 'temp-' + Date.now(), stamp_color: color, hardware_uid: hardwareUid, chip_uid: chipUid, points_value: color === 'grün' ? 1 : color === 'blau' ? 2 : 3 }];
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

  const counts = {
    total: rows.length,
    offen: rows.filter(r => r.status === 'offen').length,
    verfuegbar: rows.filter(r => r.status === 'verfuegbar').length,
    versendet: rows.filter(r => r.status === 'versendet').length,
    abgeschlossen: rows.filter(r => r.status === 'abgeschlossen').length,
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2"><Package className="w-5 h-5" /> Box-ID Verwaltung</h1>
            <p className="text-xs text-muted-foreground">
              {counts.total} Boxen · <span className="text-gray-500">{counts.offen} offen</span> · <span className="text-blue-600">{counts.verfuegbar} verfügbar</span> · <span className="text-amber-600">{counts.versendet} versendet</span> · <span className="text-green-600">{counts.abgeschlossen} abgeschlossen</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={adding}>
              {adding ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
              Box erstellen
            </Button>
            <Button size="sm" variant="outline" onClick={loadRows}><RefreshCw className="w-3 h-3 mr-1" />Aktualisieren</Button>
          </div>
        </div>

        <div className="flex gap-2 items-center bg-white p-2 rounded-xl border border-border/30">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Box-ID oder Stempel-ID suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pl-8 text-sm" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-[180px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="offen">Offen</SelectItem>
              <SelectItem value="verfuegbar">Verfügbar</SelectItem>
              <SelectItem value="versendet">Versendet</SelectItem>
              <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
              <SelectItem value="retourniert">Retourniert</SelectItem>
              <SelectItem value="in_rechnung_gestellt">In Rechnung</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white rounded-xl border border-border/30 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Laden...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Keine Box-IDs gefunden</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="h-9 text-xs font-semibold">Box-ID</TableHead>
                  <TableHead className="h-9 text-xs font-semibold">Box-Status</TableHead>
                  <TableHead className="h-9 text-xs font-semibold">Stempel-ID</TableHead>
                  <TableHead className="h-9 text-xs font-semibold">Stempel-Status</TableHead>
                  <TableHead className="h-9 text-xs font-semibold">Händler</TableHead>
                  <TableHead className="h-9 text-xs font-semibold">Erstellt</TableHead>
                  <TableHead className="h-9 text-xs font-semibold w-24">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const bs = BOX_STATUS_BADGES[row.status] || BOX_STATUS_BADGES.offen;
                  const ss = STEMPEL_STATUS_BADGES[row.stempel_status] || STEMPEL_STATUS_BADGES.offen;
                  const canChangeStatus = row.status === 'offen';
                  const canDelete = row.status === 'offen';

                  return (
                    <TableRow key={row.id} className="hover:bg-[hsl(262,40%,97%)] cursor-pointer" onClick={() => openDetailDialog(row)}>
                      <TableCell className="py-2 font-mono text-sm font-medium">{row.box_id}</TableCell>
                      <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                        {canChangeStatus ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${bs.color}`}>
                                {bs.label}
                                <ChevronDown className="w-2.5 h-2.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleStatusChange(row, 'verfuegbar')}>→ Verfügbar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium border ${bs.color}`}>{bs.label}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-xs text-muted-foreground">{row.stempel_id || '—'}</TableCell>
                      <TableCell className="py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium border ${ss.color}`}>{ss.label}</span>
                      </TableCell>
                      <TableCell className="py-2 text-sm">{row.assigned_customer_name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="py-2 text-sm text-muted-foreground">{new Date(row.created_at).toLocaleDateString("de-DE")}</TableCell>
                      <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {row.stempel_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStampDialog(row)} title="NFC Stempel"><Nfc className="h-3.5 w-3.5" /></Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteRow(row)} title="Löschen"><Trash2 className="h-3 w-3" /></Button>
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

        {/* Detail Dialog */}
        <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Box: {detailRow?.box_id}</DialogTitle>
              <DialogDescription>Stempel-ID: {detailRow?.stempel_id || '—'}</DialogDescription>
            </DialogHeader>
            {detailRow && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Box-Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${BOX_STATUS_BADGES[detailRow.status]?.color}`}>
                      {BOX_STATUS_BADGES[detailRow.status]?.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Stempel-Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${STEMPEL_STATUS_BADGES[detailRow.stempel_status]?.color}`}>
                      {STEMPEL_STATUS_BADGES[detailRow.stempel_status]?.label}
                    </span>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Händler</p><p className="font-medium mt-1">{detailRow.assigned_customer_name || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Erstellt</p><p className="mt-1">{new Date(detailRow.created_at).toLocaleDateString("de-DE")}</p></div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">Registrierte Stempel</p>
                  {loadingDetail ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : detailStamps.length > 0 ? (
                    <div className="space-y-2">
                      {detailStamps.map((s) => {
                        const colorConfig = STAMP_COLORS.find(c => c.value === s.stamp_color);
                        return (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full ${colorConfig?.colorClass || "bg-gray-300"}`} />
                              <span className="text-sm font-medium">{s.stamp_color}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{s.points_value} Punkt{s.points_value !== 1 ? "e" : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-3">Keine Stempel registriert</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* NFC Stamp Registration Dialog */}
        <Dialog open={stampDialogOpen} onOpenChange={setStampDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> NFC-Stempel: {stampDialogRow?.stempel_id}</DialogTitle>
              <DialogDescription>Registriere die NFC-Stempel für Box {stampDialogRow?.box_id}</DialogDescription>
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

        <ConfirmActionDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)} onConfirm={handleDelete} title="Box löschen?" description={`Box "${deleteRow?.box_id}" und zugehörige Stempel-ID "${deleteRow?.stempel_id}" werden dauerhaft gelöscht.`} confirmText="Löschen" confirmPhrase="LÖSCHEN" destructive />
      </div>
    </TooltipProvider>
  );
};

export default BoxManagement;
