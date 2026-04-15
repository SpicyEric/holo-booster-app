import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/GlassCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Euro, Download, FileText, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Gutschrift {
  id: string;
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
}

export default function SalesRepAbrechnungen() {
  const { user } = useAuth();
  const [gutschriften, setGutschriften] = useState<Gutschrift[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewBetrag, setPreviewBetrag] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      // Get sales rep profile id
      const { data: profile } = await supabase
        .from("sales_rep_profiles")
        .select("id, is_small_business, vat_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get gutschriften
      const { data, error } = await supabase
        .from("vertriebler_gutschriften")
        .select("*")
        .eq("vertriebler_id", profile.id)
        .order("erstelldatum", { ascending: false });

      if (error) throw error;
      setGutschriften((data || []) as unknown as Gutschrift[]);

      // Calculate preview for current month
      const { count: activeKunden } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("promoter_id", user!.id)
        .eq("active", true);

      const { data: pendingCommissions } = await supabase
        .from("commissions")
        .select("amount_cents")
        .eq("promoter_id", user!.id)
        .eq("commission_type", "initial")
        .eq("status", "available");

      const folge = (activeKunden || 0) * 12;
      const direkt = (pendingCommissions || []).reduce((s, c) => s + c.amount_cents / 100, 0);
      let netto = folge + direkt;

      const ustPflichtig = !profile.is_small_business && !!profile.vat_id;
      const brutto = ustPflichtig ? netto * 1.19 : netto;

      setPreviewBetrag(brutto);
    } catch (err: any) {
      console.error(err);
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Meine Abrechnungen</h1>
        <p className="text-muted-foreground text-sm">Deine monatlichen Gutschriften</p>
      </div>

      {/* Preview */}
      {previewBetrag !== null && previewBetrag > 0 && (
        <GlassCard className="p-5 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Voraussichtliche Auszahlung am 1. {nextMonth}
              </p>
              <p className="text-2xl font-bold">ca. {previewBetrag.toFixed(2)} €</p>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Euro className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {gutschriften.reduce((s, g) => s + (g.status === "ausgezahlt" ? Number(g.gesamt_brutto) : 0), 0).toFixed(2)} €
              </p>
              <p className="text-xs text-muted-foreground">Bereits ausgezahlt</p>
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
              <p className="text-xs text-muted-foreground">Gutschriften gesamt</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gutschriften.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Noch keine Gutschriften vorhanden
                  </TableCell>
                </TableRow>
              ) : (
                gutschriften.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-sm">{g.gutschrift_nummer}</TableCell>
                    <TableCell>{g.periode}</TableCell>
                    <TableCell className="text-right font-mono">{Number(g.gesamt_netto).toFixed(2)} €</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{Number(g.gesamt_brutto).toFixed(2)} €</TableCell>
                    <TableCell>
                      <Badge variant={g.status === "ausgezahlt" ? "default" : "secondary"}>
                        {g.status === "ausgezahlt" ? "Ausgezahlt" : "Offen"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {g.pdf_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={g.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
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
