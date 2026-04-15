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
} from "lucide-react";
import { toast } from "sonner";

interface SalesRepAccount {
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
  created_at: string;
  first_conversion_at: string | null;
  last_conversion_at: string | null;
  // computed
  total_conversions: number;
  total_commission_cents: number;
  active_boxes: number;
}

const SalesReps = () => {
  const [reps, setReps] = useState<SalesRepAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SalesRepAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => { loadReps(); }, []);

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

      // Fetch emails, subscriptions (conversions), commissions, boxes in parallel
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
      // Fallback: use email from sales_rep_profiles
      srData.forEach(sr => { if (sr.email && !emailMap[sr.user_id]) emailMap[sr.user_id] = sr.email; });

      // Count conversions per user
      const convMap: Record<string, number> = {};
      (subsRes.data || []).forEach((s: any) => {
        if (s.created_by) convMap[s.created_by] = (convMap[s.created_by] || 0) + 1;
      });

      // Sum commissions per user
      const commMap: Record<string, number> = {};
      (commissionsRes.data || []).forEach((c: any) => {
        if (c.promoter_id) commMap[c.promoter_id] = (commMap[c.promoter_id] || 0) + c.amount_cents;
      });

      // Count active boxes per user
      const boxMap: Record<string, number> = {};
      (boxesRes.data || []).forEach((b: any) => {
        if (b.vertriebler_id && b.status === "versendet") {
          boxMap[b.vertriebler_id] = (boxMap[b.vertriebler_id] || 0) + 1;
        }
      });

      // Fetch profiles for full_name
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
          created_at: sr.created_at,
          first_conversion_at: sr.first_conversion_at,
          last_conversion_at: sr.last_conversion_at,
          total_conversions: convMap[sr.user_id] || 0,
          total_commission_cents: commMap[sr.user_id] || 0,
          active_boxes: boxMap[sr.user_id] || 0,
        };
      });

      setReps(mapped);
    } catch (err: any) {
      toast.error("Fehler beim Laden: " + err.message);
    } finally {
      setLoading(false);
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

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-body truncate">{value || "—"}</p>
      </div>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-headline">{title}</h4>
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
              placeholder="Name, E-Mail, MA-Nr., Ort…"
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
            filtered.map(r => (
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
                        <Badge variant="outline" className="text-[10px] shrink-0">MA-{r.employee_number}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{r.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>{r.total_conversions} Abschlüsse</span>
                      <span>{r.city || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">
                      {r.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))
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
                  <Badge variant="outline" className="mt-1">MA-{selected.employee_number}</Badge>
                )}
              </div>
              <div className="ml-auto">
                <Badge variant={selected.is_active ? "default" : "destructive"} className="text-sm">
                  {selected.is_active ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Abschlüsse gesamt" value={selected.total_conversions} icon={<TrendingUp className="h-4 w-4" />} />
              <StatCard label="Provisionen gesamt" value={fmtEur(selected.total_commission_cents)} icon={<Star className="h-4 w-4" />} />
              <StatCard label="Aktive Boxen" value={selected.active_boxes} icon={<Building2 className="h-4 w-4" />} />
            </div>

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

            {/* Vertrag */}
            <Section title="Vertrag">
              <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Vertragsstatus" value={
                selected.contract_status === "approved" ? "✅ Genehmigt" :
                selected.contract_status === "pending" ? "⏳ Ausstehend" :
                selected.contract_status === "rejected" ? "❌ Abgelehnt" : "—"
              } />
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Vertragsfrist" value={fmt(selected.contract_deadline)} />
              <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Vertragsdatei" value={selected.contract_file_path ? "Vorhanden" : "Nicht hochgeladen"} />
            </Section>

            <Separator />

            {/* Timeline */}
            <Section title="Zeitverlauf">
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Registriert am" value={fmt(selected.created_at)} />
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Erster Abschluss" value={fmt(selected.first_conversion_at)} />
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Letzter Abschluss" value={fmt(selected.last_conversion_at)} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReps;
