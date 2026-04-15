import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Euro, Download, Search, CheckCircle, FileText, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";

interface Gutschrift {
  id: string;
  vertriebler_id: string;
  gutschrift_nummer: string;
  periode: string;
  periode_monat: number;
  periode_jahr: number;
  erstelldatum: string;
  aktive_kunden_snapshot: number;
  folgeprovision_netto: number;
  direktprovision_netto: number;
  sponsor_bonus_netto: number;
  gesamt_netto: number;
  ust_pflichtig: boolean;
  ust_betrag: number;
  gesamt_brutto: number;
  status: string;
  ausgezahlt_am: string | null;
  pdf_url: string | null;
  sales_rep_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const MONATE = [
  "", "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function AdminGutschriften() {
  const [gutschriften, setGutschriften] = useState<Gutschrift[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonat, setFilterMonat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchGutschriften();
  }, []);

  const fetchGutschriften = async () => {
    try {
      const { data, error } = await supabase
        .from("vertriebler_gutschriften")
        .select("*, sales_rep_profiles(first_name, last_name, email)")
        .order("erstelldatum", { ascending: false });

      if (error) throw error;
      setGutschriften((data || []) as unknown as Gutschrift[]);
    } catch (err: any) {
      console.error(err);
      toast.error("Fehler beim Laden der Gutschriften");
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id: string) => {
    setMarkingId(id);
    try {
      const { error } = await supabase
        .from("vertriebler_gutschriften")
        .update({ status: "ausgezahlt", ausgezahlt_am: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Gutschrift als ausgezahlt markiert");
      fetchGutschriften();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    } finally {
      setMarkingId(null);
    }
  };

  const triggerGutschriften = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("monatliche-gutschrift", {
        body: { force: true },
      });
      if (error) throw error;
      toast.success("Gutschriften erfolgreich erstellt!");
      console.log("Gutschrift results:", data);
      fetchGutschriften();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    } finally {
      setTriggering(false);
    }
  };

  const downloadPdf = async (pdfPath: string, gutschriftNummer: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("gutschriften")
        .createSignedUrl(pdfPath, 60, {
          download: `Gutschrift-${gutschriftNummer}.pdf`,
        });

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err: any) {
      toast.error("Download fehlgeschlagen: " + err.message);
    }
  };

  const monate = useMemo(() => {
    const set = new Set(gutschriften.map((g) => `${g.periode_jahr}-${g.periode_monat}`));
    return Array.from(set).sort().reverse().map((key) => {
      const [jahr, monat] = key.split("-");
      return { value: key, label: `${MONATE[parseInt(monat)]} ${jahr}` };
    });
  }, [gutschriften]);

  const filtered = useMemo(() => {
    return gutschriften.filter((g) => {
      if (filterStatus !== "all" && g.status !== filterStatus) return false;
      if (filterMonat !== "all" && `${g.periode_jahr}-${g.periode_monat}` !== filterMonat) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = `${g.sales_rep_profiles?.first_name} ${g.sales_rep_profiles?.last_name}`.toLowerCase();
        return name.includes(q) || g.gutschrift_nummer.toLowerCase().includes(q);
      }
      return true;
    });
  }, [gutschriften, filterStatus, filterMonat, searchQuery]);

  const offeneSum = useMemo(() => {
    return gutschriften
      .filter((g) => g.status === "erstellt")
      .reduce((sum, g) => sum + Number(g.gesamt_brutto), 0);
  }, [gutschriften]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">Gutschriften</h1>
          <p className="text-muted-foreground text-sm">Monatliche Abrechnungen der Vertriebler</p>
        </div>
        <Button onClick={() => setConfirmOpen(true)} disabled={triggering} variant="outline">
          {triggering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          Gutschriften jetzt erstellen
        </Button>
      </div>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={triggerGutschriften}
        title="Gutschriften erstellen"
        description="Willst du wirklich Gutschriften für alle Vertriebler neu erstellen? Bereits existierende Gutschriften für diesen Monat werden übersprungen."
        confirmText="Gutschriften erstellen"
        confirmPhrase="ERSTELLEN"
        destructive={false}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Euro className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{offeneSum.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground">Offene Auszahlungen</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{gutschriften.filter((g) => g.status === "ausgezahlt").length}</p>
              <p className="text-xs text-muted-foreground">Ausgezahlt</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{gutschriften.length}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterMonat} onValueChange={setFilterMonat}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Monat" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Monate</SelectItem>
            {monate.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="erstellt">Offen</SelectItem>
            <SelectItem value="ausgezahlt">Ausgezahlt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Vertriebler</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Keine Gutschriften gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-sm">{g.gutschrift_nummer}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {g.sales_rep_profiles?.first_name} {g.sales_rep_profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{g.sales_rep_profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{g.periode}</TableCell>
                    <TableCell className="text-right font-mono">{Number(g.gesamt_netto).toFixed(2)} €</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{Number(g.gesamt_brutto).toFixed(2)} €</TableCell>
                    <TableCell>
                      <Badge variant={g.status === "ausgezahlt" ? "default" : "secondary"}>
                        {g.status === "ausgezahlt" ? "Ausgezahlt" : "Offen"}
                      </Badge>
                      {g.ausgezahlt_am && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(g.ausgezahlt_am), "dd.MM.yyyy", { locale: de })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {g.pdf_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadPdf(g.pdf_url!, g.gutschrift_nummer)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {g.status === "erstellt" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsPaid(g.id)}
                            disabled={markingId === g.id}
                          >
                            {markingId === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                            Ausgezahlt
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
