import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus, Search, Shield, Users, Store, X, Trash2, RotateCcw, Mail,
  Phone, MapPin, Calendar, Clock, CreditCard, ArrowUpDown, ChevronRight, Building2, Hash, Globe, Pencil, Save, XCircle, Star, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type AppRole = "admin" | "partner" | "merchant" | "customer" | "end_customer";

const CATEGORIES = [
  "Café", "Restaurant", "Bäckerei", "Barbershop", "Friseur", "Shishabar",
  "CBD-Shop", "Fashion Store", "Apotheke", "Supermarkt", "Reformhaus",
  "Veganes Restaurant", "Lieferservice", "Kiosk", "Blumenladen", "Eisdiele",
  "Konditorei", "Nagelstudio", "Kosmetikstudio", "Tattoostudio", "Buchhandlung",
  "Weinhandlung", "Imbiss", "Fitnessstudio", "Waschsalon", "Handyladen", "Sonstiges",
];

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
  last_active: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
  salesRep?: {
    employee_number: number | null;
    phone: string; street: string; house_number: string; postal_code: string; city: string; country: string;
    tax_number: string; vat_id: string; iban: string; bic: string; bank_name: string; account_holder: string;
    is_small_business: boolean | null; contract_status: string | null; contract_deadline: string | null;
    is_active: boolean; first_name: string; last_name: string;
  } | null;
  merchantCustomerId?: string | null;
  merchantInfo?: {
    name: string; industry: string | null; city: string | null; phone: string | null; email: string | null;
    active: boolean; status: string | null; logo_url: string | null; customer_number: number | null;
    street: string | null; house_number: string | null; postal_code: string | null;
    website: string | null; instagram: string | null; facebook: string | null; twitter: string | null;
    description: string | null; cover_image_url: string | null;
    contact_person: string | null; contact_person_phone: string | null; contact_person_email: string | null;
  } | null;
  merchantStats?: { totalLoyaltyAccounts: number; totalTransactions: number; totalRewards: number; };
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

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);

  const [leftSearch, setLeftSearch] = useState("");
  const [leftSort, setLeftSort] = useState("name_asc");
  const [rightSearch, setRightSearch] = useState("");
  const [rightSort, setRightSort] = useState("name_asc");

  const [formData, setFormData] = useState({
    email: "", full_name: "", role: "end_customer" as AppRole, password: "",
  });

  useEffect(() => { loadAccounts(); }, []);

  // Load merchant stats when a merchant is selected
  useEffect(() => {
    if (selectedAccount?.merchantCustomerId && selectedAccount.role === "merchant") {
      loadMerchantStats(selectedAccount.merchantCustomerId);
    }
  }, [selectedAccount?.id]);

  const loadMerchantStats = async (customerId: string) => {
    try {
      const [loyaltyRes, transactionsRes, rewardsRes] = await Promise.all([
        supabase.from("loyalty_accounts").select("id", { count: "exact", head: true }).eq("merchant_customer_id", customerId),
        supabase.from("point_transactions").select("id", { count: "exact", head: true }).eq("merchant_customer_id", customerId),
        supabase.from("rewards").select("id", { count: "exact", head: true }).eq("merchant_customer_id", customerId),
      ]);
      setSelectedAccount(prev => prev ? {
        ...prev,
        merchantStats: {
          totalLoyaltyAccounts: loyaltyRes.count || 0,
          totalTransactions: transactionsRes.count || 0,
          totalRewards: rewardsRes.count || 0,
        }
      } : null);
    } catch (e) { console.error(e); }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("user_id, role, created_at");
      if (rolesError) throw rolesError;
      const roles = rolesData || [];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, full_name, created_at, updated_at, birth_date, avatar_url, gender");
      const profiles = profilesData || [];

      const userIds = roles.map(r => r.user_id);
      let emails: Record<string, string> = {};
      if (userIds.length > 0) {
        try {
          const { data: emailData } = await supabase.functions.invoke("getUserEmails", { body: { userIds } });
          emails = emailData?.emails || {};
        } catch (e) { console.error(e); }
      }

      const { data: salesRepData } = await supabase.from("sales_rep_profiles").select("*");
      const salesReps = salesRepData || [];

      const { data: merchantAssignments } = await supabase.from("merchant_assignments").select("merchant_user_id, customer_id");
      const { data: customerUsers } = await supabase.from("customer_users").select("user_id, customer_id");
      const merchantUserCustomerIds: Record<string, string> = {};
      (merchantAssignments || []).forEach(ma => { merchantUserCustomerIds[ma.merchant_user_id] = ma.customer_id; });
      (customerUsers || []).forEach(cu => { if (!merchantUserCustomerIds[cu.user_id]) merchantUserCustomerIds[cu.user_id] = cu.customer_id; });

      const customerIds = [...new Set(Object.values(merchantUserCustomerIds))];
      let customerMap: Record<string, any> = {};
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from("customers")
          .select("id, name, industry, city, phone, email, active, status, logo_url, customer_number, street, house_number, postal_code, website, instagram, facebook, twitter, description, cover_image_url, contact_person, contact_person_phone, contact_person_email")
          .in("id", customerIds);
        (customersData || []).forEach(c => { customerMap[c.id] = c; });
      }

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
        const fullName = profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || `User ${role.user_id.substring(0, 8)}`;
        const salesRep = salesReps.find(sr => sr.user_id === role.user_id);
        const custId = merchantUserCustomerIds[role.user_id];
        const custInfo = custId ? customerMap[custId] : null;

        return {
          id: role.user_id, email: emails[role.user_id] || "", full_name: fullName,
          role: role.role as AppRole, created_at: role.created_at || profile?.created_at || "",
          last_active: lastActivityMap[role.user_id] || null,
          birth_date: profile?.birth_date, avatar_url: profile?.avatar_url, gender: profile?.gender,
          salesRep: salesRep ? {
            employee_number: salesRep.employee_number, phone: salesRep.phone || "", street: salesRep.street || "",
            house_number: salesRep.house_number || "", postal_code: salesRep.postal_code || "", city: salesRep.city || "",
            country: salesRep.country || "Deutschland", tax_number: salesRep.tax_number || "", vat_id: salesRep.vat_id || "",
            iban: salesRep.iban || "", bic: salesRep.bic || "", bank_name: salesRep.bank_name || "",
            account_holder: salesRep.account_holder || "", is_small_business: salesRep.is_small_business,
            contract_status: salesRep.contract_status, contract_deadline: salesRep.contract_deadline,
            is_active: salesRep.is_active, first_name: salesRep.first_name || "", last_name: salesRep.last_name || "",
          } : null,
          merchantCustomerId: custId || null,
          merchantInfo: custInfo ? {
            name: custInfo.name, industry: custInfo.industry, city: custInfo.city, phone: custInfo.phone,
            email: custInfo.email, active: custInfo.active, status: custInfo.status, logo_url: custInfo.logo_url,
            customer_number: custInfo.customer_number, street: custInfo.street, house_number: custInfo.house_number,
            postal_code: custInfo.postal_code, website: custInfo.website, instagram: custInfo.instagram,
            facebook: custInfo.facebook, twitter: custInfo.twitter, description: custInfo.description,
            cover_image_url: custInfo.cover_image_url, contact_person: custInfo.contact_person,
            contact_person_phone: custInfo.contact_person_phone, contact_person_email: custInfo.contact_person_email,
          } : null,
        };
      });

      setAccounts(accountsData);
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Laden der Accounts");
    } finally { setLoading(false); }
  };

  // --- Edit Mode ---
  const startEditing = () => {
    if (!selectedAccount) return;
    const a = selectedAccount;
    const data: any = { full_name: a.full_name };
    if (a.salesRep) {
      data.salesRep = { ...a.salesRep };
    }
    if (a.merchantInfo) {
      data.merchantInfo = { ...a.merchantInfo };
    }
    if (a.role === "end_customer") {
      data.birth_date = a.birth_date || "";
      data.gender = a.gender || "";
    }
    setEditData(data);
    setHasChanges(false);
    setIsEditing(true);
  };

  const updateEdit = (path: string, value: any) => {
    setHasChanges(true);
    setEditData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = copy;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return copy;
    });
  };

  const handleEndEditing = () => {
    if (hasChanges) {
      setCancelEditDialogOpen(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleSaveClick = () => {
    setSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    setSaveDialogOpen(false);
    if (!selectedAccount) return;
    const a = selectedAccount;
    try {
      // Update profile name
      if (editData.full_name !== a.full_name) {
        await supabase.from("profiles").update({ full_name: editData.full_name }).eq("user_id", a.id);
      }
      // Update sales rep
      if (a.salesRep && editData.salesRep) {
        const sr = editData.salesRep;
        await supabase.from("sales_rep_profiles").update({
          first_name: sr.first_name, last_name: sr.last_name, phone: sr.phone,
          street: sr.street, house_number: sr.house_number, postal_code: sr.postal_code,
          city: sr.city, country: sr.country, tax_number: sr.tax_number, vat_id: sr.vat_id,
          iban: sr.iban, bic: sr.bic, bank_name: sr.bank_name, account_holder: sr.account_holder,
          is_small_business: sr.is_small_business,
        }).eq("user_id", a.id);
      }
      // Update merchant customer
      if (a.merchantCustomerId && editData.merchantInfo) {
        const mi = editData.merchantInfo;
        await supabase.from("customers").update({
          name: mi.name, industry: mi.industry, phone: mi.phone, email: mi.email,
          street: mi.street, house_number: mi.house_number, postal_code: mi.postal_code, city: mi.city,
          website: mi.website, instagram: mi.instagram, facebook: mi.facebook, twitter: mi.twitter,
          description: mi.description, contact_person: mi.contact_person,
          contact_person_phone: mi.contact_person_phone, contact_person_email: mi.contact_person_email,
        }).eq("id", a.merchantCustomerId);
      }
      // Update end customer profile
      if (a.role === "end_customer") {
        await supabase.from("profiles").update({
          birth_date: editData.birth_date || null,
          gender: editData.gender || null,
        }).eq("user_id", a.id);
      }
      toast.success("Änderungen gespeichert");
      setIsEditing(false);
      setHasChanges(false);
      await loadAccounts();
      // Re-select the updated account
      setSelectedAccount(prev => {
        if (!prev) return null;
        const updated = accounts.find(acc => acc.id === prev.id);
        return updated || prev;
      });
    } catch (e: any) {
      toast.error("Fehler beim Speichern");
      console.error(e);
    }
  };

  const confirmCancelEdit = () => {
    setCancelEditDialogOpen(false);
    setIsEditing(false);
    setHasChanges(false);
  };

  // Re-select account after reload
  useEffect(() => {
    if (selectedAccount && !isEditing) {
      const updated = accounts.find(a => a.id === selectedAccount.id);
      if (updated) setSelectedAccount(updated);
    }
  }, [accounts]);

  // --- Lists ---
  const leftAccounts = useMemo(() => {
    let list = accounts.filter(a => a.role === "admin" || a.role === "partner");
    if (leftSearch) {
      const term = leftSearch.toLowerCase();
      list = list.filter(a =>
        a.full_name?.toLowerCase().includes(term) || a.email?.toLowerCase().includes(term) ||
        a.salesRep?.employee_number?.toString().includes(term) || a.salesRep?.phone?.includes(term)
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

  const rightAccounts = useMemo(() => {
    let list = accounts.filter(a => a.role === "merchant" || a.role === "end_customer" || a.role === "customer");
    if (rightSearch) {
      const term = rightSearch.toLowerCase();
      list = list.filter(a =>
        a.full_name?.toLowerCase().includes(term) || a.email?.toLowerCase().includes(term) ||
        a.birth_date?.includes(term) || a.merchantInfo?.name?.toLowerCase().includes(term) ||
        a.merchantInfo?.city?.toLowerCase().includes(term) || a.merchantInfo?.industry?.toLowerCase().includes(term)
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

  // --- Handlers ---
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
    } catch (error: any) { toast.error(error.message || "Fehler beim Erstellen"); } finally { setCreating(false); }
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
          toast.success("Onboarding-E-Mail gesendet"); return;
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
      setIsEditing(false);
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
          <span className="text-xs font-bold text-muted-foreground">{(account.full_name || "?").charAt(0).toUpperCase()}</span>
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

  // --- Editable Field ---
  const EditableField = ({ label, value, path, icon, type = "text" }: {
    label: string; value: string; path: string; icon: React.ReactNode; type?: string;
  }) => {
    if (isEditing) {
      const parts = path.split(".");
      let editValue = editData;
      for (const p of parts) editValue = editValue?.[p];
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <span className="text-muted-foreground shrink-0 w-28 text-xs">{label}</span>
          <Input className="h-7 text-xs flex-1" type={type} value={editValue ?? ""} onChange={e => updateEdit(path, e.target.value)} />
        </div>
      );
    }
    return <InfoRow icon={icon} label={label} value={value || "—"} />;
  };

  const EditableSelect = ({ label, value, path, icon, options }: {
    label: string; value: string; path: string; icon: React.ReactNode; options: string[];
  }) => {
    if (isEditing) {
      const parts = path.split(".");
      let editValue = editData;
      for (const p of parts) editValue = editValue?.[p];
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <span className="text-muted-foreground shrink-0 w-28 text-xs">{label}</span>
          <Select value={editValue || ""} onValueChange={v => updateEdit(path, v)}>
            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Wählen" /></SelectTrigger>
            <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      );
    }
    return <InfoRow icon={icon} label={label} value={value || "—"} />;
  };

  const EditableTextarea = ({ label, value, path, icon }: {
    label: string; value: string; path: string; icon: React.ReactNode;
  }) => {
    if (isEditing) {
      const parts = path.split(".");
      let editValue = editData;
      for (const p of parts) editValue = editValue?.[p];
      return (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0">{icon}</span>
            <span className="text-muted-foreground text-xs">{label}</span>
          </div>
          <Textarea className="text-xs min-h-[50px]" value={editValue ?? ""} onChange={e => updateEdit(path, e.target.value)} />
        </div>
      );
    }
    return <InfoRow icon={icon} label={label} value={value || "—"} />;
  };

  // --- Detail Panel ---
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
                <h2 className="text-base font-semibold">{isEditing ? editData.full_name : a.full_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">{getRoleBadge(a.role)}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isEditing ? (
                <>
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleSaveClick}>
                    <Save className="w-3 h-3 mr-1" /> Speichern
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleEndEditing}>
                    <XCircle className="w-3 h-3 mr-1" /> Bearbeitung beenden
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startEditing}>
                  <Pencil className="w-3 h-3 mr-1" /> Bearbeiten
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedAccount(null); setIsEditing(false); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions (only when not editing) */}
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              {a.email && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleSendPasswordReset(a)}>
                  {a.role === "merchant" ? <Mail className="w-3 h-3 mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                  {a.role === "merchant" ? "Onboarding-Mail" : "Passwort zurücksetzen"}
                </Button>
              )}
              <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleDeleteAccount(a)}>
                <Trash2 className="w-3 h-3 mr-1" /> Löschen
              </Button>
            </div>
          )}

          <Separator />

          {/* General Info */}
          <Section title="Allgemein">
            {isEditing && (
              <EditableField label="Name" value={a.full_name} path="full_name" icon={<Users className="w-3.5 h-3.5" />} />
            )}
            <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="E-Mail" value={a.email || "—"} />
            <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Erstellt am" value={formatDate(a.created_at)} />
            <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Zuletzt aktiv" value={formatDateTime(a.last_active)} />
          </Section>

          {/* Sales Rep Details */}
          {a.salesRep && (
            <>
              <Section title="Vertriebsinformationen">
                {a.salesRep.employee_number && <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Mitarbeiter-Nr." value={`MA-${a.salesRep.employee_number}`} />}
                <EditableField label="Vorname" value={a.salesRep.first_name} path="salesRep.first_name" icon={<Users className="w-3.5 h-3.5" />} />
                <EditableField label="Nachname" value={a.salesRep.last_name} path="salesRep.last_name" icon={<Users className="w-3.5 h-3.5" />} />
                <EditableField label="Telefon" value={a.salesRep.phone} path="salesRep.phone" icon={<Phone className="w-3.5 h-3.5" />} />
                <EditableField label="Straße" value={a.salesRep.street} path="salesRep.street" icon={<MapPin className="w-3.5 h-3.5" />} />
                <EditableField label="Hausnr." value={a.salesRep.house_number} path="salesRep.house_number" icon={<MapPin className="w-3.5 h-3.5" />} />
                <EditableField label="PLZ" value={a.salesRep.postal_code} path="salesRep.postal_code" icon={<MapPin className="w-3.5 h-3.5" />} />
                <EditableField label="Ort" value={a.salesRep.city} path="salesRep.city" icon={<MapPin className="w-3.5 h-3.5" />} />
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
                <EditableField label="Steuernummer" value={a.salesRep.tax_number} path="salesRep.tax_number" icon={<CreditCard className="w-3.5 h-3.5" />} />
                <EditableField label="USt-ID" value={a.salesRep.vat_id} path="salesRep.vat_id" icon={<CreditCard className="w-3.5 h-3.5" />} />
                {isEditing ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-28 text-xs">Kleinunternehmer</span>
                    <Switch checked={editData.salesRep?.is_small_business || false} onCheckedChange={v => updateEdit("salesRep.is_small_business", v)} />
                  </div>
                ) : (
                  <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Kleinunternehmer" value={a.salesRep.is_small_business ? "Ja" : "Nein"} />
                )}
              </Section>

              <Section title="Bankverbindung">
                <EditableField label="Kontoinhaber" value={a.salesRep.account_holder} path="salesRep.account_holder" icon={<CreditCard className="w-3.5 h-3.5" />} />
                <EditableField label="IBAN" value={a.salesRep.iban} path="salesRep.iban" icon={<CreditCard className="w-3.5 h-3.5" />} />
                <EditableField label="BIC" value={a.salesRep.bic} path="salesRep.bic" icon={<CreditCard className="w-3.5 h-3.5" />} />
                <EditableField label="Bank" value={a.salesRep.bank_name} path="salesRep.bank_name" icon={<Building2 className="w-3.5 h-3.5" />} />
              </Section>
            </>
          )}

          {/* Merchant Details — full inline view */}
          {a.merchantInfo && (
            <>
              <Section title="Geschäftsinformationen">
                {a.merchantInfo.customer_number && <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Kundennummer" value={`${a.merchantInfo.customer_number}`} />}
                <EditableField label="Geschäftsname" value={a.merchantInfo.name} path="merchantInfo.name" icon={<Store className="w-3.5 h-3.5" />} />
                <EditableSelect label="Branche" value={a.merchantInfo.industry || ""} path="merchantInfo.industry" icon={<Users className="w-3.5 h-3.5" />} options={CATEGORIES} />
                <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Status" value={
                  a.merchantInfo.status === "paused" ? "Pausiert" :
                  a.merchantInfo.status === "canceled" ? "Gekündigt" :
                  a.merchantInfo.active ? "Aktiv" : "Inaktiv"
                } />
              </Section>

              <Section title="Anschrift">
                <EditableField label="Straße" value={a.merchantInfo.street || ""} path="merchantInfo.street" icon={<MapPin className="w-3.5 h-3.5" />} />
                <EditableField label="Hausnr." value={a.merchantInfo.house_number || ""} path="merchantInfo.house_number" icon={<MapPin className="w-3.5 h-3.5" />} />
                <EditableField label="PLZ" value={a.merchantInfo.postal_code || ""} path="merchantInfo.postal_code" icon={<MapPin className="w-3.5 h-3.5" />} />
                <EditableField label="Ort" value={a.merchantInfo.city || ""} path="merchantInfo.city" icon={<MapPin className="w-3.5 h-3.5" />} />
              </Section>

              <Section title="Kommunikation">
                <EditableField label="Geschäftstelefon" value={a.merchantInfo.phone || ""} path="merchantInfo.phone" icon={<Phone className="w-3.5 h-3.5" />} />
                <EditableField label="Geschäfts-E-Mail" value={a.merchantInfo.email || ""} path="merchantInfo.email" icon={<Mail className="w-3.5 h-3.5" />} />
                <EditableField label="Website" value={a.merchantInfo.website || ""} path="merchantInfo.website" icon={<Globe className="w-3.5 h-3.5" />} />
                <EditableField label="Instagram" value={a.merchantInfo.instagram || ""} path="merchantInfo.instagram" icon={<Globe className="w-3.5 h-3.5" />} />
                <EditableField label="Facebook" value={a.merchantInfo.facebook || ""} path="merchantInfo.facebook" icon={<Globe className="w-3.5 h-3.5" />} />
                <EditableField label="Twitter" value={a.merchantInfo.twitter || ""} path="merchantInfo.twitter" icon={<Globe className="w-3.5 h-3.5" />} />
              </Section>

              <Section title="Ansprechpartner">
                <EditableField label="Name" value={a.merchantInfo.contact_person || ""} path="merchantInfo.contact_person" icon={<Users className="w-3.5 h-3.5" />} />
                <EditableField label="Telefon" value={a.merchantInfo.contact_person_phone || ""} path="merchantInfo.contact_person_phone" icon={<Phone className="w-3.5 h-3.5" />} />
                <EditableField label="E-Mail" value={a.merchantInfo.contact_person_email || ""} path="merchantInfo.contact_person_email" icon={<Mail className="w-3.5 h-3.5" />} />
              </Section>

              <Section title="Beschreibung">
                <EditableTextarea label="Beschreibung" value={a.merchantInfo.description || ""} path="merchantInfo.description" icon={<Store className="w-3.5 h-3.5" />} />
              </Section>

              {/* Statistics */}
              {a.merchantStats && (
                <Section title="Statistiken">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/30 rounded p-2"><p className="text-lg font-bold">{a.merchantStats.totalLoyaltyAccounts}</p><p className="text-[10px] text-muted-foreground">Nutzer</p></div>
                    <div className="bg-muted/30 rounded p-2"><p className="text-lg font-bold">{a.merchantStats.totalTransactions}</p><p className="text-[10px] text-muted-foreground">Transaktionen</p></div>
                    <div className="bg-muted/30 rounded p-2"><p className="text-lg font-bold">{a.merchantStats.totalRewards}</p><p className="text-[10px] text-muted-foreground">Belohnungen</p></div>
                  </div>
                </Section>
              )}

              {/* Media */}
              {(a.merchantInfo.logo_url || a.merchantInfo.cover_image_url) && (
                <Section title="Medien">
                  <div className="grid grid-cols-2 gap-2">
                    {a.merchantInfo.logo_url && (
                      <div><p className="text-[10px] text-muted-foreground mb-1">Logo</p><img src={a.merchantInfo.logo_url} alt="Logo" className="h-12 object-contain rounded border bg-muted/30" /></div>
                    )}
                    {a.merchantInfo.cover_image_url && (
                      <div><p className="text-[10px] text-muted-foreground mb-1">Cover</p><img src={a.merchantInfo.cover_image_url} alt="Cover" className="h-12 object-cover rounded border" /></div>
                    )}
                  </div>
                </Section>
              )}
            </>
          )}

          {/* End Customer specific */}
          {a.role === "end_customer" && (
            <Section title="Endkunden-Daten">
              {isEditing ? (
                <>
                  <EditableField label="Geburtsdatum" value={a.birth_date || ""} path="birth_date" icon={<Calendar className="w-3.5 h-3.5" />} type="date" />
                  <EditableSelect label="Geschlecht" value={a.gender || ""} path="gender" icon={<Users className="w-3.5 h-3.5" />} options={["male", "female", "other"]} />
                </>
              ) : (
                <>
                  <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Geburtsdatum" value={a.birth_date ? formatDate(a.birth_date) : "Nicht angegeben"} />
                  <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Geschlecht" value={
                    a.gender === "male" ? "Männlich" : a.gender === "female" ? "Weiblich" : a.gender || "Nicht angegeben"
                  } />
                </>
              )}
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
            leftAccounts.map(a => <AccountRow key={a.id} account={a} onClick={() => { if (!isEditing || !hasChanges) { setIsEditing(false); setSelectedAccount(a); } else { toast.info("Bitte Bearbeitung zuerst beenden"); } }} />)
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
            rightAccounts.map(a => <AccountRow key={a.id} account={a} onClick={() => { if (!isEditing || !hasChanges) { setIsEditing(false); setSelectedAccount(a); } else { toast.info("Bitte Bearbeitung zuerst beenden"); } }} />)
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
            <AlertDialogAction onClick={confirmDeleteAccount} className="bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Änderungen speichern?</AlertDialogTitle>
            <AlertDialogDescription>Möchten Sie die vorgenommenen Änderungen speichern?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nein</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Ja, speichern</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Edit Confirmation Dialog */}
      <AlertDialog open={cancelEditDialogOpen} onOpenChange={setCancelEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bearbeitung beenden?</AlertDialogTitle>
            <AlertDialogDescription>Sie haben ungespeicherte Änderungen. Möchten Sie die Bearbeitung ohne Speichern beenden?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelEdit}>Beenden ohne Speichern</AlertDialogAction>
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
    <span className="text-muted-foreground shrink-0 w-28 text-xs">{label}</span>
    <span className="font-medium truncate">{value}</span>
  </div>
);

export default Accounts;
