import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { resolveMerchantCustomerId } from "@/lib/resolveMerchantCustomerId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AufstellerRequest {
  id: string;
  description: string;
  status: string;
  created_at: string;
}

interface AufstellerDesign {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  notes: string | null;
}

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  open: { label: "Offen", variant: "secondary" },
  in_progress: { label: "In Bearbeitung", variant: "default" },
  done: { label: "Erledigt", variant: "outline" },
};

export default function Aufsteller() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AufstellerRequest[]>([]);
  const [designs, setDesigns] = useState<AufstellerDesign[]>([]);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (cid: string) => {
    const [{ data: reqs }, { data: dsg }] = await Promise.all([
      supabase
        .from("aufsteller_requests")
        .select("id, description, status, created_at")
        .eq("customer_id", cid)
        .order("created_at", { ascending: false }),
      supabase
        .from("aufsteller_designs")
        .select("id, file_name, file_path, mime_type, file_size, created_at, notes")
        .eq("customer_id", cid)
        .order("created_at", { ascending: false }),
    ]);
    setRequests((reqs as AufstellerRequest[]) ?? []);
    setDesigns((dsg as AufstellerDesign[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const cid = await resolveMerchantCustomerId(user?.id);
      setCustomerId(cid);
      if (cid) await loadData(cid);
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!customerId || !description.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("aufsteller_requests").insert({
      customer_id: customerId,
      description: description.trim(),
      created_by_user_id: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Anfrage konnte nicht gespeichert werden: " + error.message);
      return;
    }
    toast.success("Anfrage gesendet");
    setDescription("");
    setOpen(false);
    await loadData(customerId);
  };

  const handleDownload = async (design: AufstellerDesign) => {
    const { data, error } = await supabase.storage
      .from("aufsteller-designs")
      .createSignedUrl(design.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Download nicht möglich");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Aufsteller</h1>
        <p className="text-muted-foreground mt-1">
          Designanfragen stellen und fertige Designs herunterladen
        </p>
      </div>

      {/* Anfragen */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Designanfragen</CardTitle>
            <CardDescription>Beschreibe, welches Aufsteller-Design du brauchst</CardDescription>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Anfrage
          </Button>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Anfragen vorhanden
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const s = statusLabel[r.status] ?? statusLabel.open;
                return (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap">{r.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(r.created_at).toLocaleString("de-DE")}
                      </p>
                    </div>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Designs */}
      <Card>
        <CardHeader>
          <CardTitle>Deine Designs</CardTitle>
          <CardDescription>
            Alle Aufsteller-Designs, die wir für dich hochgeladen haben
          </CardDescription>
        </CardHeader>
        <CardContent>
          {designs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Designs verfügbar
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {designs.map((d) => {
                const isImg = (d.mime_type || "").startsWith("image/");
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                      {isImg ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("de-DE")}
                        {d.file_size ? ` • ${(d.file_size / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(d)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anfrage-Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Designanfrage</DialogTitle>
            <DialogDescription>
              Beschreibe so genau wie möglich, welches Aufsteller-Design du brauchst.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="desc">Beschreibung</Label>
            <Textarea
              id="desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Z. B. Aufsteller A5, Hauptmotiv: Treuepass, Hintergrund in unserer Markenfarbe, Logo prominent oben..."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !description.trim()}>
              {submitting ? "Wird gesendet..." : "Anfrage senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
