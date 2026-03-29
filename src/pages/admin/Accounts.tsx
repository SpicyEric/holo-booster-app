import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus, Search, Shield, Users, Store, UserCheck, X, Trash2, RotateCcw, Mail,
  Phone, MapPin, Calendar, Clock, CreditCard, ArrowUpDown, ChevronRight, Building2, Hash, Globe, Edit,
} from "lucide-react";
import { toast } from "sonner";

type AppRole = "admin" | "partner" | "merchant" | "customer" | "end_customer";

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
  last_active: string | null;
  // Profile extras
  birth_date?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
  // Sales rep extras
  salesRep?: {
    employee_number: number | null;
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
    is_active: boolean;
    first_name: string;
    last_name: string;
  } | null;
  // Merchant extras
  merchantCustomerId?: string | null;
  merchantInfo?: {
    name: string;
    industry: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
    status: string | null;
    logo_url: string | null;
    customer_number: number | null;
  } | null;
}

const Accounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Left panel: search + sort
  const [leftSearch, setLeftSearch] = useState("");
  const [leftSort, setLeftSort] = useState("name_asc");

  // Right panel: search + sort
  const [rightSearch, setRightSearch] = useState("");
  const [rightSort, setRightSort] = useState("name_asc");

  // Create form
  const [formData, setFormData] = useState({
    email: "", full_name: "", role: "end_customer" as AppRole, password: "",
  });

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles").select("user_id, role, created_at");
      if (rolesError) throw rolesError;
      const roles = rolesData || [];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, full_name, created_at, updated_at, birth_date, avatar_url, gender");
      const profiles = profilesData || [];

      // Fetch emails
      const userIds = roles.map(r => r.user_id);
      let emails: Record<string, string> = {};
      if (userIds.length > 0) {
        try {
          const { data: emailData } = await supabase.functions.invoke("getUserEmails", { body: { userIds } });
          emails = emailData?.emails || {};
        } catch (e) { console.error(e); }
      }

      // Sales rep profiles
      const { data: salesRepData } = await supabase.from("sales_rep_profiles").select("*");
      const salesReps = salesRepData || [];

      // Merchant assignments + customer data
      const { data: merchantAssignments } = await supabase.from("merchant_assignments").select("merchant_user_id, customer_id");
      const { data: customerUsers } = await supabase.from("customer_users").select("user_id, customer_id");
      const merchantUserCustomerIds: Record<string, string> = {};
      (merchantAssignments || []).forEach(ma => { merchantUserCustomerIds[ma.merchant_user_id] = ma.customer_id; });
      (customerUsers || []).forEach(cu => {
        if (!merchantUserCustomerIds[cu.user_id]) merchantUserCustomerIds[cu.user_id] = cu.customer_id;
      });

      const customerIds = [...new Set(Object.values(merchantUserCustomerIds))];
      let customerMap: Record<string, any> = {};
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from("customers")
          .select("id, name, industry, city, phone, email, active, status, logo_url, customer_number")
          .in("id", customerIds);
        (customersData || []).forEach(c => { customerMap[c.id] = c; });
      }

      // Last activity
      const lastActivityMap: Record<string, string> = {};
      const { data: ptData } = await supabase.from("point_transactions").select("loyalty_account_id, created_at").order("created_at", { ascending: false }).limit(500);
      if (ptData && ptData.length > 0) {
        const { data: laData } = await supabase.from("loyalty_accounts").select("id, user_id");
        const laMap: Record<string, string> = {};
        (laData || []).forEach(la => { laMap[la.id] = la.user_id; });
        for (const pt of ptData) {
          const userId = laMap[pt.loyalty_account_id];
          if (userId && !lastActivityMap[userId]) lastActivityMap[userId] = pt.created_at;
        }
      }
      const { data: msgData } = await supabase.from("app_messages").select("user_id, read_at").not("read_at", "is", null).order("read_at", { ascending: false }).limit(500);
      for (const msg of (msgData || [])) {
        if (!lastActivityMap[msg.user_id] || new Date(msg.read_at!) > new Date(lastActivityMap[msg.user_id])) {
          lastActivityMap[msg.user_id] = msg.read_at!;
        }
      }
      for (const p of profiles) {
        const updated = (p as any).updated_at;
        if (updated && (!lastActivityMap[p.user_id] || new Date(updated) > new Date(lastActivityMap[p.user_id]))) {
          lastActivityMap[p.user_id] = updated;
        }
      }

      const accountsData: UserAccount[] = roles.map(role => {
        const profile = profiles.find(p => p.user_id === role.user_id);
        const fullName = profile?.full_name ||
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          `User ${role.user_id.substring(0, 8)}`;

        const salesRep = salesReps.find(sr => sr.user_id === role.user_id);
        const custId = merchantUserCustomerIds[role.user_id];
        const custInfo = custId ? customerMap[custId] : null;

        return {
          id: role.user_id,
          email: emails[role.user_id] || "",
          full_name: fullName,
          role: role.role as AppRole,
          created_at: role.created_at || profile?.created_at || "",
          last_active: lastActivityMap[role.user_id] || null,
          birth_date: profile?.birth_date,
          avatar_url: profile?.avatar_url,
          gender: profile?.gender,
          salesRep: salesRep ? {
            employee_number: salesRep.employee_number,
            phone: salesRep.phone || "",
            street: salesRep.street || "",
            house_number: salesRep.house_number || "",
            postal_code: salesRep.postal_code || "",
            city: salesRep.city || "",
            country: salesRep.country || "Deutschland",
            tax_number: salesRep.tax_number || "",
            vat_id: salesRep.vat_id || "",
            iban: salesRep.iban || "",
            bic: salesRep.bic || "",
            bank_name: salesRep.bank_name || "",
            account_holder: salesRep.account_holder || "",
            is_small_business: salesRep.is_small_business,
            contract_status: salesRep.contract_status,
            contract_deadline: salesRep.contract_deadline,
            is_active: salesRep.is_active,
            first_name: salesRep.first_name || "",
            last_name: salesRep.last_name || "",
          } : null,
          merchantCustomerId: custId || null,
          merchantInfo: custInfo ? {
            name: custInfo.name,
            industry: custInfo.industry,
            city: custInfo.city,
            phone: custInfo.phone,
            email: custInfo.email,
            active: custInfo.active,
            status: custInfo.status,
            logo_url: custInfo.logo_url,
            customer_number: custInfo.customer_number,
          } : null,
        };
      });

      setAccounts(accountsData);
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Laden der Accounts");
    } finally {
      setLoading(false);
    }
  };

  // Left panel: admins + partners
  const leftAccounts = useMemo(() => {
    let list = accounts.filter(a => a.role === "admin" || a.role === "partner");
    if (leftSearch) {
      const term = leftSearch.toLowerCase();
      list = list.filter(a =>
        a.full_name?.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        a.salesRep?.employee_number?.toString().includes(term) ||
        a.salesRep?.phone?.includes(term)
      );
    }
    list.sort((a, b) => {
      switch (leftSort) {
        case "name_asc": return (a.full_name || "").localeCompare(b.full_name || "");
        case "name_desc": return (b.full_name || "").localeCompare(a.full_name || "");
        case "date_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "role": return a.role.localeCompare(b.role);
        default: return 0;
      }
    });
    return list;
  }, [accounts, leftSearch, leftSort]);

  // Right panel: merchants + end_customers
  const rightAccounts = useMemo(() => {
    let list = accounts.filter(a => a.role === "merchant" || a.role === "end_customer" || a.role === "customer");
    if (rightSearch) {
      const term = rightSearch.toLowerCase();
      list = list.filter(a =>
        a.full_name?.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        a.birth_date?.includes(term) ||
        a.merchantInfo?.name?.toLowerCase().includes(term) ||
        a.merchantInfo?.city?.toLowerCase().includes(term) ||
        a.merchantInfo?.industry?.toLowerCase().includes(term)
      );
    }
    list.sort((a, b) => {
      switch (rightSort) {
        case "name_asc": return (a.full_name || "").localeCompare(b.full_name || "");
        case "name_desc": return (b.full_name || "").localeCompare(a.full_name || "");
        case "date_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "role": return a.role.localeCompare(b.role);
        default: return 0;
      }
    });
    return list;
  }, [accounts, rightSearch, rightSort]);

  const handleCreateAccount = async () => {
    if (!formData.email || !formData.full_name) { toast.error("Bitte alle Felder ausfüllen"); return; }
    setCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password || Math.random().toString(36).slice(-12),
        options: { data: { first_name: formData.full_name.split(" ")[0], last_name: formData.full_name.split(" ").slice(1).join(" ") } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Benutzer konnte nicht erstellt werden");
      const { error: roleError } = await supabase.from("user_roles").insert([{ user_id: authData.user.id, role: formData.role }]);
      if (roleError) throw roleError;
      toast.success("Account erstellt!");
      setDialogOpen(false);
      setFormData({ email: "", full_name: "", role: "end_customer", password: "" });
      loadAccounts();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen");
    } finally { setCreating(false); }
  };

  const handleSendPasswordReset = async (account: UserAccount) => {
    if (!account.email) { toast.error("Keine E-Mail-Adresse"); return; }
    try {
      if (account.role === "merchant" && account.merchantCustomerId) {
        const { data: customer } = await supabase.from("customers").select("id, name, company_name").eq("id", account.merchantCustomerId).single();
        if (customer) {
          const passwordSetupUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-setup-redirect?cid=${encodeURIComponent(customer.id)}&email=${encodeURIComponent(account.email)}`;
          await supabase.functions.invoke("send-merchant-onboarding", {
            body: { to: account.email, companyName: customer.company_name || customer.name, contactName: customer.name, passwordSetupUrl },
          });
          await supabase.from("customers").update({ onboarding_email_sent_at: new Date().toISOString() }).eq("id", customer.id);
          toast.success("Onboarding-E-Mail gesendet");
          return;
        }
      }
      await supabase.functions.invoke("sendPasswordReset", { body: { email: account.email } });
      toast.success("Passwort-Reset-E-Mail gesendet");
    } catch (e: any) { toast.error("Fehler beim Senden"); console.error(e); }
  };

  const handleDeleteAccount = (account: UserAccount) => {
    setSelectedAccount(account);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!selectedAccount) return;
    if (deleteConfirmText.toLowerCase() !== "löschen") { toast.error('Bitte "löschen" eingeben'); return; }
    try {
      await supabase.from("user_roles").delete().eq("user_id", selectedAccount.id);
      await supabase.from("profiles").delete().eq("user_id", selectedAccount.id);
      const { error: deleteError } = await supabase.functions.invoke("deleteUserAccount", { body: { userId: selectedAccount.id } });
      if (deleteError) toast.error("Rolle entfernt, Auth-User nicht gelöscht");
      else toast.success("Account gelöscht");
      setDeleteDialogOpen(false);
      setSelectedAccount(null);
      loadAccounts();
    } catch (e: any) { toast.error("Fehler beim Löschen"); console.error(e); }
  };

  const getRoleBadge = (role: AppRole) => {
    const map: Record<AppRole, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      admin: { label: "Admin", variant: "destructive" },
      partner: { label: "Vertriebler", variant: "secondary" },
      merchant: { label: "Händler", variant: "default" },
      customer: { label: "Kunde (Alt)", variant: "outline" },
      end_customer: { label: "Endkunde", variant: "outline" },
    };
    const c = map[role] || { label: role, variant: "outline" as const };
    return <Badge variant={c.variant} className="text-[10px] px-1.5 py-0">{c.label}</Badge>;
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const formatDateTime = (d: string | null) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const adminCount = accounts.filter(a => a.role === "admin").length;
  const partnerCount = accounts.filter(a => a.role === "partner").length;
  const merchantCount = accounts.filter(a => a.role === "merchant").length;
  const endCustomerCount = accounts.filter(a => a.role === "end_customer" || a.role === "customer").length;

  const AccountRow = ({ account, onClick }: { account: UserAccount; onClick: () => void }) => (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${selectedAccount?.id === account.id ? "bg-muted/70" : ""}`}
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-full overflow-hidden border border-border/50 bg-muted/30 flex items-center justify-center shrink-0">
        {account.avatar_url || account.merchantInfo?.logo_url ? (
          <img src={account.avatar_url || account.merchantInfo?.logo_url || ""} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">
            {(account.full_name || "?").charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{account.full_name}</span>
          {getRoleBadge(account.role)}
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {account.email || "—"}
          {account.merchantInfo && <span className="ml-2">• {account.merchantInfo.name}</span>}
          {account.salesRep?.employee_number && <span className="ml-2">• MA-{account.salesRep.employee_number}</span>}
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </div>
  );

  const renderDetailPanel = () => {
    if (!selectedAccount) return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="text-center">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Account auswählen</p>
        </div>
      </div>
    );

    const a = selectedAccount;

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                {a.avatar_url || a.merchantInfo?.logo_url ? (
                  <img src={a.avatar_url || a.merchantInfo?.logo_url || ""} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">{(a.full_name || "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold">{a.full_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">{getRoleBadge(a.role)}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedAccount(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {a.email && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleSendPasswordReset(a)}>
                {a.role === "merchant" ? <Mail className="w-3 h-3 mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                {a.role === "merchant" ? "Onboarding-Mail" : "Passwort zurücksetzen"}
              </Button>
            )}
            {a.role === "merchant" && a.merchantCustomerId && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`/admin/customers/${a.merchantCustomerId}`)}>
                <Store className="w-3 h-3 mr-1" /> Kundendetails
              </Button>
            )}
            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleDeleteAccount(a)}>
              <Trash2 className="w-3 h-3 mr-1" /> Löschen
            </Button>
          </div>

          <Separator />

          {/* General Info */}
          <Section title="Allgemein">
            <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="E-Mail" value={a.email || "—"} />
            <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Erstellt am" value={formatDate(a.created_at)} />
            <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Zuletzt aktiv" value={formatDateTime(a.last_active)} />
            {a.birth_date && <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Geburtsdatum" value={formatDate(a.birth_date)} />}
            {a.gender && <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Geschlecht" value={a.gender === "male" ? "Männlich" : a.gender === "female" ? "Weiblich" : a.gender} />}
          </Section>

          {/* Sales Rep Details */}
          {a.salesRep && (
            <>
              <Section title="Vertriebsinformationen">
                {a.salesRep.employee_number && <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Mitarbeiter-Nr." value={`MA-${a.salesRep.employee_number}`} />}
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Telefon" value={a.salesRep.phone || "—"} />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Adresse" value={
                  [a.salesRep.street, a.salesRep.house_number].filter(Boolean).join(" ") +
                  (a.salesRep.postal_code || a.salesRep.city ? ", " + [a.salesRep.postal_code, a.salesRep.city].filter(Boolean).join(" ") : "") || "—"
                } />
                <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Status" value={a.salesRep.is_active ? "Aktiv" : "Inaktiv"} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Vertragsstatus" value={
                  a.salesRep.contract_status === "approved" ? "✅ Genehmigt" :
                  a.salesRep.contract_status === "submitted" ? "📋 Eingereicht" : "⏳ Ausstehend"
                } />
                {a.salesRep.contract_deadline && (
                  <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Vertragsfrist" value={formatDate(a.salesRep.contract_deadline)} />
                )}
              </Section>

              <Section title="Steuerdaten">
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Steuernummer" value={a.salesRep.tax_number || "—"} />
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="USt-ID" value={a.salesRep.vat_id || "—"} />
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Kleinunternehmer" value={a.salesRep.is_small_business ? "Ja" : "Nein"} />
              </Section>

              <Section title="Bankverbindung">
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Kontoinhaber" value={a.salesRep.account_holder || "—"} />
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="IBAN" value={a.salesRep.iban || "—"} />
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="BIC" value={a.salesRep.bic || "—"} />
                <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Bank" value={a.salesRep.bank_name || "—"} />
              </Section>
            </>
          )}

          {/* Merchant Details */}
          {a.merchantInfo && (
            <Section title="Geschäftsinformationen">
              {a.merchantInfo.customer_number && <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Kundennummer" value={`${a.merchantInfo.customer_number}`} />}
              <InfoRow icon={<Store className="w-3.5 h-3.5" />} label="Geschäftsname" value={a.merchantInfo.name} />
              <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Branche" value={a.merchantInfo.industry || "—"} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Stadt" value={a.merchantInfo.city || "—"} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Geschäftstelefon" value={a.merchantInfo.phone || "—"} />
              <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Geschäfts-E-Mail" value={a.merchantInfo.email || "—"} />
              <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Status" value={
                a.merchantInfo.status === "paused" ? "Pausiert" :
                a.merchantInfo.status === "canceled" ? "Gekündigt" :
                a.merchantInfo.active ? "Aktiv" : "Inaktiv"
              } />
            </Section>
          )}

          {/* End Customer specific */}
          {a.role === "end_customer" && (
            <Section title="Endkunden-Daten">
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Geburtsdatum" value={a.birth_date ? formatDate(a.birth_date) : "Nicht angegeben"} />
              <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Geschlecht" value={
                a.gender === "male" ? "Männlich" : a.gender === "female" ? "Weiblich" : a.gender || "Nicht angegeben"
              } />
            </Section>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] -m-6">
      {/* LEFT: Admins + Sales Reps */}
      <div className="w-[340px] border-r bg-background flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-destructive" />
              <h2 className="text-sm font-semibold">Team</h2>
              <span className="text-xs text-muted-foreground">({adminCount + partnerCount})</span>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 text-xs"><UserPlus className="w-3 h-3 mr-1" /> Neu</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Account erstellen</DialogTitle>
                  <DialogDescription>Erstellen Sie einen neuen Benutzer-Account.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-3">
                  <div><Label className="text-xs">E-Mail</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="user@example.com" /></div>
                  <div><Label className="text-xs">Vollständiger Name</Label><Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Max Mustermann" /></div>
                  <div><Label className="text-xs">Rolle</Label>
                    <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v as AppRole })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="end_customer">Endkunde</SelectItem>
                        <SelectItem value="merchant">Händler</SelectItem>
                        <SelectItem value="partner">Vertriebler</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Passwort (optional)</Label><Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Automatisch" /></div>
                  <Button onClick={handleCreateAccount} disabled={creating} className="w-full">Account erstellen</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Suchen..." value={leftSearch} onChange={e => setLeftSearch(e.target.value)} className="h-7 pl-7 text-xs" />
            </div>
            <Select value={leftSort} onValueChange={setLeftSort}>
              <SelectTrigger className="h-7 w-[100px] text-xs"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="date_desc">Neueste</SelectItem>
                <SelectItem value="date_asc">Älteste</SelectItem>
                <SelectItem value="role">Rolle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Laden...</div>
          ) : leftAccounts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Keine Accounts</div>
          ) : (
            leftAccounts.map(a => <AccountRow key={a.id} account={a} onClick={() => setSelectedAccount(a)} />)
          )}
        </div>
      </div>

      {/* MIDDLE: Detail Panel */}
      <div className="flex-1 border-r bg-background">
        {renderDetailPanel()}
      </div>

      {/* RIGHT: Merchants + End Customers */}
      <div className="w-[340px] bg-background flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Kunden & Endkunden</h2>
            <span className="text-xs text-muted-foreground">({merchantCount + endCustomerCount})</span>
          </div>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Name, E-Mail, Geburtstag..." value={rightSearch} onChange={e => setRightSearch(e.target.value)} className="h-7 pl-7 text-xs" />
            </div>
            <Select value={rightSort} onValueChange={setRightSort}>
              <SelectTrigger className="h-7 w-[100px] text-xs"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="date_desc">Neueste</SelectItem>
                <SelectItem value="date_asc">Älteste</SelectItem>
                <SelectItem value="role">Rolle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Laden...</div>
          ) : rightAccounts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Keine Accounts</div>
          ) : (
            rightAccounts.map(a => <AccountRow key={a.id} account={a} onClick={() => setSelectedAccount(a)} />)
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Account von <strong>{selectedAccount?.full_name}</strong> ({selectedAccount?.email}) wird unwiderruflich gelöscht.
              <div className="mt-3">
                <Label className="text-xs">Bitte "löschen" eingeben:</Label>
                <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} className="mt-1" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAccount}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Helper components
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-muted-foreground shrink-0">{icon}</span>
    <span className="text-muted-foreground shrink-0 w-28">{label}</span>
    <span className="font-medium truncate">{value}</span>
  </div>
);

export default Accounts;
