import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Smartphone,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface PushLog {
  id: string;
  created_at: string;
  user_id: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  source: string | null;
  trigger_function: string | null;
  device_count: number;
  sent_count: number;
  failed_count: number;
  invalid_token_count: number;
  status: string;
  error_message: string | null;
  fcm_responses: unknown;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; className?: string }
> = {
  success: { label: "Erfolgreich", variant: "default", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  partial: { label: "Teilweise", variant: "secondary", icon: AlertTriangle, className: "bg-amber-500/15 text-amber-700 border-amber-300" },
  failed: { label: "Fehlgeschlagen", variant: "destructive", icon: XCircle },
  error: { label: "Fehler", variant: "destructive", icon: XCircle },
  no_devices: { label: "Keine Geräte", variant: "outline", icon: Smartphone },
  pending: { label: "Ausstehend", variant: "outline", icon: RefreshCw },
};

export default function PushLogs() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PushLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("push_notification_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error("Fehler beim Laden: " + error.message);
    } else {
      setLogs((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      log.title?.toLowerCase().includes(q) ||
      log.body?.toLowerCase().includes(q) ||
      log.recipient_email?.toLowerCase().includes(q) ||
      log.recipient_name?.toLowerCase().includes(q) ||
      log.source?.toLowerCase().includes(q) ||
      log.trigger_function?.toLowerCase().includes(q) ||
      log.status?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === "success").length,
    failed: logs.filter((l) => l.status === "failed" || l.status === "error").length,
    partial: logs.filter((l) => l.status === "partial").length,
    devices: logs.reduce((sum, l) => sum + (l.sent_count || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Push-Benachrichtigungen
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            Übersicht der zuletzt gesendeten Push-Benachrichtigungen via Firebase Cloud Messaging.
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Gesamt" value={stats.total} />
        <StatCard label="Erfolgreich" value={stats.success} tone="success" />
        <StatCard label="Teilweise" value={stats.partial} tone="warning" />
        <StatCard label="Fehlgeschlagen" value={stats.failed} tone="danger" />
        <StatCard label="Geräte erreicht" value={stats.devices} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <span>Letzte 200 Benachrichtigungen</span>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Zeit</TableHead>
                  <TableHead>Empfänger</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Auslöser</TableHead>
                  <TableHead className="text-center">Geräte</TableHead>
                  <TableHead className="text-center">Sent / Fail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Lade…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Keine Push-Benachrichtigungen gefunden.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((log) => {
                  const cfg = statusConfig[log.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(log)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd.MM. HH:mm:ss", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {log.recipient_name || log.recipient_email || "—"}
                        </div>
                        {log.recipient_name && log.recipient_email && (
                          <div className="text-xs text-muted-foreground">{log.recipient_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="font-medium truncate">{log.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{log.body}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.trigger_function || log.source || "—"}
                      </TableCell>
                      <TableCell className="text-center text-sm">{log.device_count}</TableCell>
                      <TableCell className="text-center text-sm">
                        <span className="text-emerald-600">{log.sent_count}</span>
                        {" / "}
                        <span className="text-red-600">{log.failed_count}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className={cfg.className}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Push-Benachrichtigung Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <DetailRow label="Zeit" value={format(new Date(selected.created_at), "dd.MM.yyyy HH:mm:ss", { locale: de })} />
              <DetailRow label="Status" value={<Badge>{selected.status}</Badge>} />
              <DetailRow label="Empfänger" value={selected.recipient_name || "—"} />
              <DetailRow label="E-Mail" value={selected.recipient_email || "—"} />
              <DetailRow label="User-ID" value={<code className="text-xs">{selected.user_id || "—"}</code>} />
              <DetailRow label="Auslöser" value={selected.trigger_function || selected.source || "—"} />
              <DetailRow label="Geräte gesamt" value={selected.device_count} />
              <DetailRow label="Erfolgreich gesendet" value={selected.sent_count} />
              <DetailRow label="Fehlgeschlagen" value={selected.failed_count} />
              <DetailRow label="Ungültige Tokens (gelöscht)" value={selected.invalid_token_count} />

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Titel</div>
                <div className="p-3 rounded bg-muted text-sm">{selected.title}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Text</div>
                <div className="p-3 rounded bg-muted text-sm whitespace-pre-wrap">{selected.body}</div>
              </div>

              {selected.error_message && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">Fehler</div>
                  <div className="p-3 rounded bg-red-500/10 border border-red-300 text-sm text-red-800">{selected.error_message}</div>
                </div>
              )}

              {selected.data && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Daten-Payload</div>
                  <pre className="p-3 rounded bg-muted text-xs overflow-x-auto">{JSON.stringify(selected.data, null, 2)}</pre>
                </div>
              )}

              {selected.fcm_responses && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">FCM-Antworten</div>
                  <pre className="p-3 rounded bg-muted text-xs overflow-x-auto max-h-80">{JSON.stringify(selected.fcm_responses, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" | "danger" }) {
  const toneClass =
    tone === "success" ? "text-emerald-600" :
    tone === "warning" ? "text-amber-600" :
    tone === "danger" ? "text-red-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 text-sm">
      <div className="w-44 shrink-0 text-muted-foreground">{label}</div>
      <div className="flex-1 font-medium break-all">{value}</div>
    </div>
  );
}
