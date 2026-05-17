import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

interface Customer {
  id: string;
  company_name: string | null;
  name: string;
}

interface AufstellerRequest {
  id: string;
  customer_id: string;
  description: string;
  status: string;
  created_at: string;
  customers?: { company_name: string | null; name: string } | null;
}

interface AufstellerDesign {
  id: string;
  customer_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  notes: string | null;
  customers?: { company_name: string | null; name: string } | null;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "done", label: "Erledigt" },
];

export default function AdminAufsteller() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AufstellerRequest[]>([]);
  const [designs, setDesigns] = useState<AufstellerDesign[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadAll = async () => {
    const [{ data: reqs }, { data: dsg }, { data: cust }] = await Promise.all([
      supabase
        .from("aufsteller_requests")
        .select("id, customer_id, description, status, created_at, customers(company_name, name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("aufsteller_designs")
        .select("id, customer_id, file_name, file_path, mime_type, file_size, created_at, notes, customers(company_name, name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, company_name, name")
        .order("company_name", { ascending: true }),
    ]);
    setRequests((reqs as any) ?? []);
    setDesigns((dsg as any) ?? []);
    setCustomers((cust as Customer[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAll();
      setLoading(false);
    })();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [(c.company_name || ""), c.name].join(" ").toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const requestsForCustomer = useMemo(
    () => requests.filter((r) => r.customer_id === selectedCustomerId),
    [requests, selectedCustomerId]
  );

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase
      .from("aufsteller_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Status konnte nicht geändert werden");
      return;
    }
    toast.success("Status aktualisiert");
    await loadAll();
  };

  const handleUpload = async () => {
    if (!file || !selectedCustomerId) {
      toast.error("Datei und Kunde sind erforderlich");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const path = `${selectedCustomerId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("aufsteller-designs")
        .upload(path, file);
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("aufsteller_designs").insert({
        customer_id: selectedCustomerId,
        request_id: selectedRequestId || null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by_user_id: user?.id ?? null,
        uploaded_by_email: user?.email ?? null,
        notes: notes.trim() || null,
      });
      if (dbErr) throw dbErr;

      toast.success("Design hochgeladen");
      setFile(null);
      setSelectedCustomerId("");
      setSelectedRequestId("");
      setNotes("");
      setCustomerSearch("");
      setUploadOpen(false);
      await loadAll();
    } catch (e: any) {
      toast.error("Upload fehlgeschlagen: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("aufsteller-designs")
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Download nicht möglich");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (d: AufstellerDesign) => {
    if (!confirm(`Design "${d.file_name}" wirklich löschen?`)) return;
    await supabase.storage.from("aufsteller-designs").remove([d.file_path]);
    const { error } = await supabase.from("aufsteller_designs").delete().eq("id", d.id);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
      return;
    }
    toast.success("Design gelöscht");
    await loadAll();
  };

  const customerLabel = (c?: { company_name: string | null; name: string } | null) =>
    c?.company_name || c?.name || "—";

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-headline font-bold">Aufsteller</h1>
          <p className="text-muted-foreground mt-1">
            Designanfragen verwalten und Designs für Kunden hochladen
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Design hochladen
        </Button>
      </div>

      {/* Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Anfragen</CardTitle>
          <CardDescription>Eingegangene Designanfragen von Händlern</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Keine Anfragen</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{customerLabel(r.customers)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("de-DE")}
                      </p>
                    </div>
                    <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-3">
                    {r.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCustomerId(r.customer_id);
                      setSelectedRequestId(r.id);
                      setUploadOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Upload className="h-3 w-3" /> Design für diese Anfrage hochladen
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Designs */}
      <Card>
        <CardHeader>
          <CardTitle>Hochgeladene Designs</CardTitle>
          <CardDescription>Alle Designs nach Kunde</CardDescription>
        </CardHeader>
        <CardContent>
          {designs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Noch keine Designs</p>
          ) : (
            <div className="space-y-2">
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
                        <Badge variant="outline" className="mr-2">
                          {customerLabel(d.customers)}
                        </Badge>
                        {new Date(d.created_at).toLocaleDateString("de-DE")}
                        {d.file_size ? ` • ${(d.file_size / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleDownload(d.file_path)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(d)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Design hochladen</DialogTitle>
            <DialogDescription>
              Wähle eine Datei und ordne sie einem Kunden zu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Datei</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} • {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Kunde suchen</Label>
              <Input
                placeholder="Firma oder Name..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Keine Treffer</div>
                  ) : (
                    filteredCustomers.slice(0, 50).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {customerLabel(c)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomerId && requestsForCustomer.length > 0 && (
              <div className="space-y-2">
                <Label>Anfrage zuordnen (optional)</Label>
                <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Keine Anfrage" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestsForCustomer.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {new Date(r.created_at).toLocaleDateString("de-DE")} —{" "}
                        {r.description.slice(0, 60)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notiz (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Interne Notiz..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !selectedCustomerId}>
              {uploading ? "Lädt hoch..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
