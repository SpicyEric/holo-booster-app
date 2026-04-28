import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Upload, FileText, Plus, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";

interface Version {
  id: string;
  version: string;
  titel: string;
  pdf_url: string;
  ist_aktiv: boolean;
  notizen: string | null;
  created_at: string;
}

export default function AdminVertragsversionen() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    version: "",
    titel: "Vertriebspartnervertrag",
    notizen: "",
    ist_aktiv: true,
    file: null as File | null,
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("vertrag_versionen") as any)
      .select("*")
      .order("created_at", { ascending: false });
    setVersions(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ version: "", titel: "Vertriebspartnervertrag", notizen: "", ist_aktiv: true, file: null });
  };

  const handleUpload = async () => {
    if (!form.file || !form.version.trim()) {
      toast.error("Version und PDF-Datei sind Pflicht");
      return;
    }
    setUploading(true);
    try {
      const path = `${form.version.trim()}/${Date.now()}_${form.file.name}`;
      const { error: upErr } = await supabase.storage
        .from("vertraege-vorlagen")
        .upload(path, form.file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await (supabase.from("vertrag_versionen") as any).insert({
        version: form.version.trim(),
        titel: form.titel.trim() || "Vertriebspartnervertrag",
        pdf_url: path,
        ist_aktiv: form.ist_aktiv,
        notizen: form.notizen.trim() || null,
      });
      if (insErr) throw insErr;

      toast.success(form.ist_aktiv
        ? "Version aktiviert. Betroffene Vertriebler werden benachrichtigt."
        : "Version gespeichert"
      );
      setDialogOpen(false);
      resetForm();
      await load();

      if (form.ist_aktiv) {
        // Trigger E-Mail-Versand asynchron
        supabase.functions.invoke("notify-vertrag-version", { body: { version: form.version.trim() } })
          .catch(() => { /* silent */ });
      }
    } catch (err: any) {
      toast.error("Upload fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (v: Version) => {
    setActivating(v.id);
    try {
      const { error } = await (supabase.from("vertrag_versionen") as any)
        .update({ ist_aktiv: true })
        .eq("id", v.id);
      if (error) throw error;
      toast.success("Version aktiviert. Betroffene Vertriebler werden benachrichtigt.");
      await load();
      supabase.functions.invoke("notify-vertrag-version", { body: { version: v.version } })
        .catch(() => { /* silent */ });
    } catch (err: any) {
      toast.error("Aktivierung fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setActivating(null);
    }
  };

  const handleDownload = async (v: Version) => {
    try {
      // Versuche zuerst den klassischen Storage-Download (für hochgeladene PDF-Vorlagen)
      const isCodeGenerated = !v.pdf_url || v.pdf_url.startsWith("generated/");
      if (!isCodeGenerated) {
        const { data, error } = await supabase.storage.from("vertraege-vorlagen").download(v.pdf_url);
        if (!error && data) {
          const url = URL.createObjectURL(data);
          const link = document.createElement("a");
          link.href = url;
          link.download = `Vertrag_${v.version}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return;
        }
      }

      // Fallback / Code-Generated: Vorlage über Edge Function rendern
      const { data, error } = await supabase.functions.invoke("preview-contract-template", {
        body: { version: v.version },
      });
      if (error) throw error;
      const blob = data instanceof Blob ? data : new Blob([data as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Vertragsvorlage_${v.version}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Download fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vertragsversionen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalte Vorlagen des Vertriebspartnervertrags. Wird eine neue Version aktiviert,
            werden alle bestehenden Vertriebler zur Re-Annahme aufgefordert.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Neue Version hochladen
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : versions.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Noch keine Vertragsversion hochgeladen.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {versions.map((v) => (
            <GlassCard key={v.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold">{v.titel}</h3>
                    <Badge variant="outline">{v.version}</Badge>
                    {v.ist_aktiv && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle2 className="w-3 h-3 mr-1" />Aktiv
                      </Badge>
                    )}
                  </div>
                  {v.notizen && <p className="text-sm text-muted-foreground mt-2">{v.notizen}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    Hochgeladen am {new Date(v.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(v)}>
                    <Download className="w-4 h-4 mr-2" />PDF
                  </Button>
                  {!v.ist_aktiv && (
                    <Button
                      size="sm"
                      onClick={() => handleActivate(v)}
                      disabled={activating === v.id}
                    >
                      {activating === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aktivieren"}
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Vertragsversion</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Version *</Label>
              <Input placeholder="z. B. v5" value={form.version} onChange={(e) => setForm(f => ({ ...f, version: e.target.value }))} />
            </div>
            <div>
              <Label>Titel</Label>
              <Input value={form.titel} onChange={(e) => setForm(f => ({ ...f, titel: e.target.value }))} />
            </div>
            <div>
              <Label>Notizen (intern)</Label>
              <Textarea rows={3} value={form.notizen} onChange={(e) => setForm(f => ({ ...f, notizen: e.target.value }))} />
            </div>
            <div>
              <Label>PDF-Vorlage *</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.ist_aktiv} onChange={(e) => setForm(f => ({ ...f, ist_aktiv: e.target.checked }))} />
              Sofort als aktive Version setzen (alle Vertriebler werden zur Re-Annahme aufgefordert)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>Abbrechen</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lädt hoch...</> : <><Upload className="w-4 h-4 mr-2" />Hochladen</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
