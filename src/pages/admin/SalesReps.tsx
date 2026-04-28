import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, Users, Phone, MapPin, Calendar, Hash, Shield, Building2,
  CreditCard, FileText, TrendingUp, Star, Loader2, ChevronRight, Trash2, Mail,
  CheckCircle, Download, Eye, Clock,
} from "lucide-react";
import { toast } from "sonner";

interface ContractUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  confirmed_at: string | null;
  confirmed_by_user_id: string | null;
}

interface SalesRepAccount {
  id: string; // sales_rep_profiles.id
  user_id: string;
  email: string;
  full_name: string;
  employee_number: number | null;
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string;
  tax_number: string;
  vat_id: string;
  iban: string;
  bic: string;
  bank_name: string;
  account_holder: string;
  is_small_business: boolean | null;
  contract_status: string | null;
  contract_deadline: string | null;
  contract_file_path: string | null;
  is_active: boolean;
  activated_at: string | null;
  created_at: string;
  first_conversion_at: string | null;
  last_conversion_at: string | null;
  total_conversions: number;
  total_commission_cents: number;
  active_boxes: number;
  // Digital angenommener Vertrag (sign-contract Edge Function)
  vertrag_version: string | null;
  vertrag_angenommen_am: string | null;
  vertrag_pdf_url: string | null;
  vertrag_ip: string | null;
  vertrag_user_agent: string | null;
  vertrag_outdated: boolean | null;
  vertrag_inaktiv: boolean | null;
}

// "Digital angenommen" = Vertrag wurde über den Wizard signiert (sign-contract).
const isDigitallySigned = (rep: SalesRepAccount): boolean =>
  rep.contract_status === "angenommen" && !!rep.vertrag_angenommen_am;

const getStatusLabel = (rep: SalesRepAccount): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  // Digital angenommener Vertrag = aktiv (auch ohne separates activated_at)
  if (isDigitallySigned(rep) && !rep.vertrag_inaktiv) {
    return { label: "Aktiv", variant: "default" };
  }
  if (rep.contract_status === "approved" && rep.is_active && rep.activated_at) {
    return { label: "Aktiv", variant: "default" };
  }
  if (rep.contract_status === "submitted") {
    return { label: "Zu bearbeiten", variant: "outline" };
  }
  if (rep.contract_status === "pending") {
    return { label: "Neu", variant: "secondary" };
  }
  if (rep.contract_status === "rejected") {
    return { label: "Abgelehnt", variant: "destructive" };
  }
  return { label: "Neu", variant: "secondary" };
};

const SalesReps = () => {
  const [reps, setReps] = useState<SalesRepAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SalesRepAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [contractUploads, setContractUploads] = useState<ContractUpload[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [confirmingContractId, setConfirmingContractId] = useState<string | null>(null);

  useEffect(() => { loadReps(); }, []);

  useEffect(() => {
    if (selected) loadContracts(selected.id);
    else setContractUploads([]);
  }, [selected?.id]);

  const loadReps = async () => {
    try {
      setLoading(true);
      const { data: srData, error: srErr } = await supabase
        .from("sales_rep_profiles")
        .select("*")
        .order("employee_number", { ascending: true });
      if (srErr) throw srErr;
      if (!srData?.length) { setReps([]); return; }

      const userIds = srData.map(s => s.user_id);

      const [emailsRes, subsRes, commissionsRes, boxesRes] = await Promise.all([
        supabase.functions.invoke("getUserEmails", { body: { userIds } }),
        supabase.from("customer_subscriptions").select("created_by").in("created_by", userIds),
        supabase.from("commissions").select("promoter_id, amount_cents").in("promoter_id", userIds),
        supabase.from("eloyo_boxes").select("vertriebler_id, status").in("vertriebler_id", userIds),
      ]);

      const emailMap: Record<string, string> = {};
      const rawEmails = emailsRes.data?.emails;
      if (rawEmails && typeof rawEmails === "object") {
        if (Array.isArray(rawEmails)) {
          rawEmails.forEach((e: any) => { emailMap[e.id] = e.email; });
        } else {
          Object.entries(rawEmails).forEach(([uid, email]) => { emailMap[uid] = email as string; });
        }
      }
      srData.forEach(sr => { if (sr.email && !emailMap[sr.user_id]) emailMap[sr.user_id] = sr.email; });

      const convMap: Record<string, number> = {};
      (subsRes.data || []).forEach((s: any) => {
        if (s.created_by) convMap[s.created_by] = (convMap[s.created_by] || 0) + 1;
      });
      const commMap: Record<string, number> = {};
      (commissionsRes.data || []).forEach((c: any) => {
        if (c.promoter_id) commMap[c.promoter_id] = (commMap[c.promoter_id] || 0) + c.amount_cents;
      });
      const boxMap: Record<string, number> = {};
      (boxesRes.data || []).forEach((b: any) => {
        if (b.vertriebler_id && b.status === "versendet") {
          boxMap[b.vertriebler_id] = (boxMap[b.vertriebler_id] || 0) + 1;
        }
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, first_name, last_name")
        .in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p; });

      const mapped: SalesRepAccount[] = srData.map(sr => {
        const profile = profileMap[sr.user_id];
        const fullName = profile?.full_name || [sr.first_name, sr.last_name].filter(Boolean).join(" ") || "—";
        return {
          id: sr.id,
          user_id: sr.user_id,
          email: emailMap[sr.user_id] || "—",
          full_name: fullName,
          employee_number: sr.employee_number,
          first_name: sr.first_name || "",
          last_name: sr.last_name || "",
          phone: sr.phone || "",
          street: sr.street || "",
          house_number: sr.house_number || "",
          postal_code: sr.postal_code || "",
          city: sr.city || "",
          country: sr.country || "Deutschland",
          tax_number: sr.tax_number || "",
          vat_id: sr.vat_id || "",
          iban: sr.iban || "",
          bic: sr.bic || "",
          bank_name: sr.bank_name || "",
          account_holder: sr.account_holder || "",
          is_small_business: sr.is_small_business,
          contract_status: sr.contract_status,
          contract_deadline: sr.contract_deadline,
          contract_file_path: sr.contract_file_path,
          is_active: sr.is_active,
          activated_at: (sr as any).activated_at,
          created_at: sr.created_at,
          first_conversion_at: sr.first_conversion_at,
          last_conversion_at: sr.last_conversion_at,
          total_conversions: convMap[sr.user_id] || 0,
          total_commission_cents: commMap[sr.user_id] || 0,
          active_boxes: boxMap[sr.user_id] || 0,
          vertrag_version: (sr as any).vertrag_version || null,
          vertrag_angenommen_am: (sr as any).vertrag_angenommen_am || null,
          vertrag_pdf_url: (sr as any).vertrag_pdf_url || null,
          vertrag_ip: (sr as any).vertrag_ip || null,
          vertrag_user_agent: (sr as any).vertrag_user_agent || null,
          vertrag_outdated: (sr as any).vertrag_outdated ?? null,
          vertrag_inaktiv: (sr as any).vertrag_inaktiv ?? null,
        };
      });

      setReps(mapped);
    } catch (err: any) {
      toast.error("Fehler beim Laden: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async (profileId: string) => {
    setLoadingContracts(true);
    try {
      const { data, error } = await supabase
        .from("sales_rep_contract_uploads")
        .select("*")
        .eq("vertriebler_id", profileId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      setContractUploads((data as any[]) || []);
    } catch (e: any) {
      console.error("Error loading contracts:", e);
      setContractUploads([]);
    } finally {
      setLoadingContracts(false);
    }
  };

  const downloadContract = async (filePath: string, fileName: string, bucket: "sales-rep-contracts" | "vertraege" = "sales-rep-contracts") => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60, { download: fileName });
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error("Fehler beim Download: " + e.message);
    }
  };

  const viewContract = async (filePath: string, bucket: "sales-rep-contracts" | "vertraege" = "vertraege") => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error("Fehler beim Öffnen: " + e.message);
    }
  };

  const confirmContract = async (uploadId: string) => {
    setConfirmingContractId(uploadId);
    try {
      const { error } = await supabase
        .from("sales_rep_contract_uploads")
        .update({ confirmed_at: new Date().toISOString(), confirmed_by_user_id: (await supabase.auth.getUser()).data.user?.id })
        .eq("id", uploadId);
      if (error) throw error;
      toast.success("Vertrag bestätigt");
      if (selected) {
        await loadContracts(selected.id);
        // Update contract_status to submitted if still pending
        if (selected.contract_status === "pending" || selected.contract_status === "submitted") {
          await supabase
            .from("sales_rep_profiles")
            .update({ contract_status: "submitted" })
            .eq("id", selected.id);
        }
      }
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    } finally {
      setConfirmingContractId(null);
    }
  };

  const activateAccount = async () => {
    if (!selected) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("sales_rep_profiles")
        .update({
          contract_status: "approved",
          is_active: true,
          activated_at: now,
        })
        .eq("id", selected.id);
      if (error) throw error;
      toast.success("Account aktiviert! 90-Tage-Timer gestartet.");
      setActivateDialogOpen(false);
      await loadReps();
      // Re-select updated rep
      setSelected(prev => prev ? { ...prev, contract_status: "approved", is_active: true, activated_at: now } : null);
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    }
  };

  const confirmDeleteRep = async () => {
    if (!selected) return;
    if (deleteConfirmText.toLowerCase() !== "löschen") { toast.error('Bitte "löschen" eingeben'); return; }
    try {
      await supabase.from("sales_rep_profiles").delete().eq("user_id", selected.user_id);
      await supabase.from("user_roles").delete().eq("user_id", selected.user_id).eq("role", "partner");
      await supabase.from("profiles").delete().eq("user_id", selected.user_id);
      await supabase.functions.invoke("deleteUserAccount", { body: { userId: selected.user_id } });
      toast.success("Vertriebler gelöscht");
      setDeleteDialogOpen(false);
      setSelected(null);
      loadReps();
    } catch (e: any) { toast.error("Fehler beim Löschen: " + e.message); }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return reps;
    const t = searchTerm.toLowerCase();
    return reps.filter(r =>
      r.full_name.toLowerCase().includes(t) ||
      r.email.toLowerCase().includes(t) ||
      r.employee_number?.toString().includes(t) ||
      r.city.toLowerCase().includes(t)
    );
  }, [reps, searchTerm]);

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("de-DE") : "—";
  const fmtEur = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  const fmtSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if activation is possible: all uploads confirmed, at least one upload exists
  const canActivate = selected &&
    selected.contract_status !== "approved" &&
    contractUploads.length > 0 &&
    contractUploads.every(u => u.confirmed_at !== null);

  const hasUnconfirmedContracts = contractUploads.some(u => !u.confirmed_at);

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-body truncate">{value || "—"}</p>
      </div>
    </div>
  );

  const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-headline">{title}</h4>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );

  const StatCard = ({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) => (
    <div className="bg-muted/50 rounded-xl p-3 text-center space-y-1">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <p className="text-lg font-bold font-headline">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left list */}
      <div className="w-[340px] border-r flex flex-col shrink-0">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-headline">Vertriebler</h2>
            <Badge variant="secondary" className="text-xs">{reps.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name, E-Mail, PID, Ort…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Keine Vertriebler gefunden</p>
          ) : (
            filtered.map(r => {
              const status = getStatusLabel(r);
              return (
                <button
                  key={r.user_id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 ${
                    selected?.user_id === r.user_id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{r.full_name}</span>
                        {r.employee_number && (
                          <Badge variant="outline" className="text-[10px] shrink-0">PID-{r.employee_number}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{r.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{r.total_conversions} Abschlüsse</span>
                        <span>{r.city || "—"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={status.variant} className="text-[10px]">
                        {status.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <Users className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-sm">Vertriebler auswählen</p>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl font-headline">
                {selected.first_name?.[0] || selected.full_name?.[0] || "?"}
              </div>
              <div>
                <h2 className="text-xl font-bold font-headline">{selected.full_name}</h2>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
                {selected.employee_number && (
                  <Badge variant="outline" className="mt-1">PID-{selected.employee_number}</Badge>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant={getStatusLabel(selected).variant} className="text-sm">
                  {getStatusLabel(selected).label}
                </Badge>
                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => { setDeleteConfirmText(""); setDeleteDialogOpen(true); }}>
                  <Trash2 className="w-3 h-3 mr-1" /> Löschen
                </Button>
              </div>
            </div>

            {/* Activation Banner — Vertrag digital angenommen ODER alter Upload-Flow */}
            {(() => {
              const digSigned = isDigitallySigned(selected);
              const fullyActive = digSigned || (selected.contract_status === "approved" && selected.is_active);
              if (fullyActive) return null;
              return (
                <div className={`flex items-start gap-3 p-4 rounded-lg ${
                  canActivate
                    ? "bg-green-50 border border-green-200"
                    : "bg-muted/50 border border-border"
                }`}>
                  {canActivate ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-700">Alle Verträge bestätigt</p>
                        <p className="text-sm text-green-600">Account kann jetzt aktiviert werden. Der 90-Tage-Timer startet mit der Aktivierung.</p>
                      </div>
                      <Button size="sm" onClick={() => setActivateDialogOpen(true)} className="shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Account aktivieren
                      </Button>
                    </>
                  ) : (
                    <>
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Vertrag noch nicht angenommen</p>
                        <p className="text-sm text-muted-foreground">
                          Der Vertriebspartner hat den Vertrag noch nicht digital im Backoffice angenommen.
                          Sobald er den Vertrag akzeptiert, ist der Account automatisch aktiv.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Banner: Aktiv via digitale Annahme */}
            {isDigitallySigned(selected) && !selected.vertrag_inaktiv && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-700">
                    Vertrag digital angenommen{selected.vertrag_version ? ` (${selected.vertrag_version})` : ""}
                  </p>
                  <p className="text-sm text-green-600">
                    Angenommen am {fmt(selected.vertrag_angenommen_am)}
                    {selected.vertrag_ip ? ` · IP: ${selected.vertrag_ip.split(",")[0].trim()}` : ""}
                  </p>
                </div>
                {selected.vertrag_pdf_url && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => viewContract(selected.vertrag_pdf_url!, "vertraege")}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Ansehen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => downloadContract(
                        selected.vertrag_pdf_url!,
                        `Vertriebspartnervertrag_PID-${selected.employee_number || "VP"}_${selected.vertrag_version || ""}.pdf`,
                        "vertraege"
                      )}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Abschlüsse gesamt" value={selected.total_conversions} icon={<TrendingUp className="h-4 w-4" />} />
              <StatCard label="Provisionen gesamt" value={fmtEur(selected.total_commission_cents)} icon={<Star className="h-4 w-4" />} />
              <StatCard label="Aktive Boxen" value={selected.active_boxes} icon={<Building2 className="h-4 w-4" />} />
            </div>

            <Separator />

            {/* Vertragsdokumente — bevorzugt digital, sonst alte Uploads */}
            <Section title="Vertragsdokument">
              {isDigitallySigned(selected) && selected.vertrag_pdf_url ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50/50 border-green-200 mt-2">
                  <FileText className="h-5 w-5 shrink-0 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Vertriebspartnervertrag {selected.vertrag_version || ""}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      <span className="text-green-600 font-medium">✓ Digital angenommen am {fmt(selected.vertrag_angenommen_am)}</span>
                      {selected.vertrag_ip && (
                        <>
                          <span>·</span>
                          <span>IP: {selected.vertrag_ip.split(",")[0].trim()}</span>
                        </>
                      )}
                    </div>
                    {selected.vertrag_user_agent && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={selected.vertrag_user_agent}>
                        {selected.vertrag_user_agent}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => viewContract(selected.vertrag_pdf_url!, "vertraege")}
                      title="Ansehen"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => downloadContract(
                        selected.vertrag_pdf_url!,
                        `Vertriebspartnervertrag_PID-${selected.employee_number || "VP"}_${selected.vertrag_version || ""}.pdf`,
                        "vertraege"
                      )}
                      title="Herunterladen"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : loadingContracts ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Lade Verträge…</span>
                </div>
              ) : contractUploads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">Noch kein Vertrag angenommen.</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {contractUploads.map(upload => (
                    <div key={upload.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                      upload.confirmed_at ? "bg-green-50/50 border-green-200" : "bg-muted/30 border-border"
                    }`}>
                      <FileText className={`h-5 w-5 shrink-0 ${upload.confirmed_at ? "text-green-600" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{upload.file_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{fmt(upload.uploaded_at)}</span>
                          <span>·</span>
                          <span>{fmtSize(upload.file_size)}</span>
                          {upload.confirmed_at && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 font-medium">✓ Bestätigt am {fmt(upload.confirmed_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => downloadContract(upload.file_path, upload.file_name)}
                          title="Herunterladen"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {!upload.confirmed_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={confirmingContractId === upload.id}
                            onClick={() => confirmContract(upload.id)}
                          >
                            {confirmingContractId === upload.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" /> Bestätigen
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Separator />

            {/* Personal */}
            <Section title="Persönliche Daten">
              <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Vorname" value={selected.first_name} />
              <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Nachname" value={selected.last_name} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Telefon" value={selected.phone} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Adresse" value={
                [selected.street, selected.house_number].filter(Boolean).join(" ") +
                (selected.postal_code || selected.city ? `, ${selected.postal_code} ${selected.city}` : "")
              } />
            </Section>

            <Separator />

            {/* Steuer & Bank */}
            <Section title="Steuer- & Bankdaten">
              <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Steuernummer" value={selected.tax_number} />
              <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="USt-ID" value={selected.vat_id} />
              <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="IBAN" value={selected.iban} />
              <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="BIC" value={selected.bic} />
              <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Bank" value={selected.bank_name} />
              <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Kontoinhaber" value={selected.account_holder} />
              <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Kleinunternehmer" value={
                selected.is_small_business === true ? "Ja" : selected.is_small_business === false ? "Nein" : "—"
              } />
            </Section>

            <Separator />

            {/* Vertrag Status */}
            <Section title="Vertragsstatus">
              <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Status" value={
                selected.contract_status === "approved" ? "✅ Genehmigt" :
                selected.contract_status === "submitted" ? "📋 Eingereicht — zu bearbeiten" :
                selected.contract_status === "pending" ? "⏳ Ausstehend (Neu)" :
                selected.contract_status === "rejected" ? "❌ Abgelehnt" : "—"
              } />
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Vertragsfrist" value={fmt(selected.contract_deadline)} />
              {selected.activated_at && (
                <InfoRow icon={<CheckCircle className="w-3.5 h-3.5" />} label="Aktiviert am" value={fmt(selected.activated_at)} />
              )}
            </Section>

            <Separator />

            {/* Timeline */}
            <Section title="Zeitverlauf">
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Registriert am" value={fmt(selected.created_at)} />
              {selected.activated_at && (
                <InfoRow icon={<CheckCircle className="w-3.5 h-3.5" />} label="Aktiviert am" value={fmt(selected.activated_at)} />
              )}
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Erster Abschluss" value={fmt(selected.first_conversion_at)} />
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Letzter Abschluss" value={fmt(selected.last_conversion_at)} />
            </Section>
          </div>
        )}
      </div>
    </div>

    {/* Delete Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vertriebler löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Account von <strong>{selected?.full_name}</strong> ({selected?.email}) wird unwiderruflich gelöscht.
            Gutschriften bleiben zur Dokumentation erhalten.
            <div className="mt-3">
              <Label className="text-xs">Bitte "löschen" eingeben:</Label>
              <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} className="mt-1" />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDeleteRep} className="bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Activate Dialog */}
    <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account aktivieren?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Account von <strong>{selected?.full_name}</strong> wird aktiviert.
            Der 90-Tage-Timer für den ersten Abschluss startet jetzt.
            Nach 365 Tagen Inaktivität wird der Account automatisch gelöscht.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={activateAccount}>Aktivieren</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default SalesReps;
