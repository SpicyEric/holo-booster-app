import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Upload, FileText, Plus, Download, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

interface Z {
  id: string;
  titel: string;
  beschreibung: string | null;
  pdf_url: string;
  ist_aktiv: boolean;
  pflicht: boolean;
  created_at: string;
}

export default function AdminZusatzvereinbarungen() {
  const [items, setItems] = useState<Z[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ titel: "", beschreibung: "", pflicht: true, ist_aktiv: true, file: null as File | null });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("zusatzvereinbarungen") as any).select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!form.file || !form.titel.trim()) { toast.error("Titel und PDF sind Pflicht"); return; }
    setUploading(true);
    try {
      const path = `zusatz/${Date.now()}_${form.file.name}`;
      const { error: upErr } = await supabase.storage.from("vertraege-vorlagen").upload(path, form.file, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { error: insErr } = await (supabase.from("zusatzvereinbarungen") as any).insert({
        titel: form.titel.trim(),
        beschreibung: form.beschreibung.trim() || null,
        pdf_url: path,
        ist_aktiv: form.ist_aktiv,
        pflicht: form.pflicht,
      });
      if (insErr) throw insErr;
      toast.success("Zusatzvereinbarung gespeichert");
      setDialogOpen(false);
      setForm({ titel: "", beschreibung: "", pflicht: true, ist_aktiv: true, file: null });
      await load();
    } catch (err: any) {
      toast.error("Fehler: " + (err.message || "Unbekannt"));
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (z: Z) => {
    setToggling(z.id);
    try {
      const { error } = await (supabase.from("zusatzvereinbarungen") as any).update({ ist_aktiv: !z.ist_aktiv }).eq("id", z.id);
      if (error) throw error;
      toast.success(!z.ist_aktiv ? "Aktiviert" : "Deaktiviert");
      await load();
    } catch (err: any) {
      toast.error("Fehler: " + (err.message || "Unbekannt"));
    } finally {
      setToggling(null);
    }
  };

  const handleDownload = async (z: Z) => {
    try {
      const { data, error } = await supabase.storage.from("vertraege-vorlagen").download(z.pdf_url);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${z.titel.replace(/[^\w-]+/g, "_")}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Download fehlgeschlagen");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zusatzvereinbarungen</h1>
          <p className="text-sm text-muted-foreground mt-1">Optionale oder verpflichtende Zusatzdokumente für Vertriebspartner.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Neue Vereinbarung</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Noch keine Zusatzvereinbarungen vorhanden.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {items.map((z) => (
            <GlassCard key={z.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{z.titel}</h3>
                    {z.ist_aktiv ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktiv</Badge>
                    ) : (
                      <Badge variant="outline">Inaktiv</Badge>
                    )}
                    {z.pflicht && <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Pflicht</Badge>}
                  </div>
                  {z.beschreibung && <p className="text-sm text-muted-foreground mt-2">{z.beschreibung}</p>}
                  <p className="text-xs text-muted-foreground mt-2">Erstellt am {new Date(z.created_at).toLocaleDateString("de-DE")}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(z)}><Download className="w-4 h-4 mr-2" />PDF</Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(z)} disabled={toggling === z.id}>
                    {toggling === z.id ? <Loader2 className="w-4 h-4 animate-spin" /> : z.ist_aktiv ? <><PowerOff className="w-4 h-4 mr-2" />Deaktivieren</> : <><Power className="w-4 h-4 mr-2" />Aktivieren</>}
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Zusatzvereinbarung</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Titel *</Label><Input value={form.titel} onChange={(e) => setForm(f => ({ ...f, titel: e.target.value }))} /></div>
            <div><Label>Beschreibung</Label><Textarea rows={3} value={form.beschreibung} onChange={(e) => setForm(f => ({ ...f, beschreibung: e.target.value }))} /></div>
            <div><Label>PDF *</Label><Input type="file" accept="application/pdf" onChange={(e) => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.pflicht} onChange={(e) => setForm(f => ({ ...f, pflicht: e.target.checked }))} /> Pflicht-Annahme</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ist_aktiv} onChange={(e) => setForm(f => ({ ...f, ist_aktiv: e.target.checked }))} /> Sofort aktivieren</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>Abbrechen</Button>
            <Button onClick={handleUpload} disabled={uploading}>{uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lädt...</> : <><Upload className="w-4 h-4 mr-2" />Speichern</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
