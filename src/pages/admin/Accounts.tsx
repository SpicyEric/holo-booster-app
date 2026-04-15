import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, Users, Mail, Calendar, Clock, ArrowUpDown, ChevronRight,
  Trash2, RotateCcw, Pencil, Save, XCircle, X, Star, Store, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_active: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);

  // Loyalty points
  const [loyaltyData, setLoyaltyData] = useState<{ merchant_name: string; points: number; merchant_customer_id: string }[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  useEffect(() => {
    if (selectedAccount?.id) {
      loadLoyaltyData(selectedAccount.id);
    } else {
      setLoyaltyData([]);
    }
  }, [selectedAccount?.id]);

  const loadLoyaltyData = async (userId: string) => {
    setLoyaltyLoading(true);
    try {
      const { data: accts } = await supabase
        .from("loyalty_accounts")
        .select("merchant_customer_id, current_points_balance")
        .eq("user_id", userId);
      if (!accts || accts.length === 0) { setLoyaltyData([]); return; }
      const merchantIds = accts.map(a => a.merchant_customer_id);
      const { data: merchants } = await supabase.from("customers").select("id, name").in("id", merchantIds);
      const nameMap = new Map((merchants || []).map(m => [m.id, m.name]));
      setLoyaltyData(
        accts.map(a => ({
          merchant_customer_id: a.merchant_customer_id,
          merchant_name: nameMap.get(a.merchant_customer_id) || "Unbekannt",
          points: a.current_points_balance || 0,
        })).sort((a, b) => b.points - a.points)
      );
    } catch { setLoyaltyData([]); } finally { setLoyaltyLoading(false); }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      // Only load end_customer roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .in("role", ["end_customer", "customer"]);
      if (rolesError) throw rolesError;
      const roles = rolesData || [];

      const userIds = roles.map(r => r.user_id);
      if (userIds.length === 0) { setAccounts([]); return; }

      const [profilesRes, emailsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, last_name, full_name, created_at, updated_at, birth_date, avatar_url, gender").in("user_id", userIds),
        supabase.functions.invoke("getUserEmails", { body: { userIds } }),
      ]);
      const profiles = profilesRes.data || [];

      const emails: Record<string, string> = {};
      const rawEmails = emailsRes.data?.emails;
      if (rawEmails && typeof rawEmails === "object") {
        if (Array.isArray(rawEmails)) {
          rawEmails.forEach((e: any) => { emails[e.id] = e.email; });
        } else {
          Object.entries(rawEmails).forEach(([uid, email]) => { emails[uid] = email as string; });
        }
      }

      // Last activity
      const lastActivityMap: Record<string, string> = {};
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
        return {
          id: role.user_id, email: emails[role.user_id] || "", full_name: fullName,
          created_at: role.created_at || profile?.created_at || "",
          last_active: lastActivityMap[role.user_id] || null,
          birth_date: profile?.birth_date, avatar_url: profile?.avatar_url, gender: profile?.gender,
        };
      });

      setAccounts(accountsData);
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Laden der User-Accounts");
    } finally { setLoading(false); }
  };

  // Edit
  const startEditing = () => {
    if (!selectedAccount) return;
    setEditData({ full_name: selectedAccount.full_name, birth_date: selectedAccount.birth_date || "", gender: selectedAccount.gender || "" });
    setHasChanges(false);
    setIsEditing(true);
  };

  const confirmSave = async () => {
    setSaveDialogOpen(false);
    if (!selectedAccount) return;
    try {
      await supabase.from("profiles").update({
        full_name: editData.full_name,
        birth_date: editData.birth_date || null,
        gender: editData.gender || null,
      }).eq("user_id", selectedAccount.id);
      toast.success("Änderungen gespeichert");
      setIsEditing(false);
      setHasChanges(false);
      await loadAccounts();
    } catch { toast.error("Fehler beim Speichern"); }
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!selectedAccount) return;
    if (deleteConfirmText.toLowerCase() !== "löschen") { toast.error('Bitte "löschen" eingeben'); return; }
    try {
      await supabase.from("user_roles").delete().eq("user_id", selectedAccount.id);
      await supabase.from("profiles").delete().eq("user_id", selectedAccount.id);
      await supabase.functions.invoke("deleteUserAccount", { body: { userId: selectedAccount.id } });
      toast.success("Account gelöscht");
      setDeleteDialogOpen(false);
      setSelectedAccount(null);
      setIsEditing(false);
      loadAccounts();
    } catch { toast.error("Fehler beim Löschen"); }
  };

  const filtered = useMemo(() => {
    let list = [...accounts];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(a => a.full_name?.toLowerCase().includes(t) || a.email?.toLowerCase().includes(t) || a.birth_date?.includes(t));
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return (a.full_name || "").localeCompare(b.full_name || "");
        case "name_desc": return (b.full_name || "").localeCompare(a.full_name || "");
        case "date_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });
    return list;
  }, [accounts, searchTerm, sortBy]);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const formatDateTime = (d: string | null) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground shrink-0 w-28 text-xs">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] -m-6">
      {/* Left: User list */}
      <div className="w-[340px] border-r bg-background flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">User-Accounts</h2>
            <span className="text-xs text-muted-foreground">({accounts.length})</span>
          </div>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Name, E-Mail…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-7 pl-7 text-xs" />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-7 w-[100px] text-xs"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="date_desc">Neueste</SelectItem>
                <SelectItem value="date_asc">Älteste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Laden...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Keine User-Accounts</div>
          ) : (
            filtered.map(a => (
              <div
                key={a.id}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${selectedAccount?.id === a.id ? "bg-muted/70" : ""}`}
                onClick={() => { if (!isEditing || !hasChanges) { setIsEditing(false); setSelectedAccount(a); } }}
              >
                <div className="w-8 h-8 rounded-full border border-border/50 bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">{(a.full_name || "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate block">{a.full_name}</span>
                  <span className="text-xs text-muted-foreground truncate block">{a.email || "—"}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 bg-background overflow-y-auto">
        {!selectedAccount ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>User auswählen</p>
            </div>
          </div>
        ) : (() => {
          const a = selectedAccount;
          return (
            <div className="p-5 max-w-2xl space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden">
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{(a.full_name || "?").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">{isEditing ? editData.full_name : a.full_name}</h2>
                    <Badge variant="outline" className="text-[10px] mt-0.5">Endkunde</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isEditing ? (
                    <>
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setSaveDialogOpen(true)}>
                        <Save className="w-3 h-3 mr-1" /> Speichern
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => hasChanges ? setCancelEditDialogOpen(true) : setIsEditing(false)}>
                        <XCircle className="w-3 h-3 mr-1" /> Beenden
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

              {!isEditing && (
                <div className="flex flex-wrap gap-2">
                  {a.email && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={async () => {
                      try {
                        await supabase.functions.invoke("sendPasswordReset", { body: { email: a.email } });
                        toast.success("Passwort-Reset-E-Mail gesendet");
                      } catch { toast.error("Fehler"); }
                    }}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Passwort zurücksetzen
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={handleDeleteAccount}>
                    <Trash2 className="w-3 h-3 mr-1" /> Löschen
                  </Button>
                </div>
              )}

              <Separator />

              <Section title="Allgemein">
                {isEditing ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-28 text-xs">Name</span>
                    <Input className="h-7 text-xs flex-1" value={editData.full_name} onChange={e => { setEditData({ ...editData, full_name: e.target.value }); setHasChanges(true); }} />
                  </div>
                ) : null}
                <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="E-Mail" value={a.email || "—"} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Erstellt am" value={formatDate(a.created_at)} />
                <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Zuletzt aktiv" value={formatDateTime(a.last_active)} />
              </Section>

              <Separator />

              <Section title="Endkunden-Daten">
                {isEditing ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-28 text-xs">Geburtsdatum</span>
                      <Input className="h-7 text-xs flex-1" type="date" value={editData.birth_date} onChange={e => { setEditData({ ...editData, birth_date: e.target.value }); setHasChanges(true); }} />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-28 text-xs">Geschlecht</span>
                      <Select value={editData.gender} onValueChange={v => { setEditData({ ...editData, gender: v }); setHasChanges(true); }}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Wählen" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Männlich</SelectItem>
                          <SelectItem value="female">Weiblich</SelectItem>
                          <SelectItem value="other">Divers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

              <Separator />

              {/* Loyalty Points */}
              <Section title="Treuepunkte">
                {loyaltyLoading ? (
                  <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                ) : loyaltyData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Keine Punkte gesammelt</p>
                ) : (
                  <div className="space-y-1.5">
                    {loyaltyData.map(ld => (
                      <div key={ld.merchant_customer_id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/30 border border-border/30">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{ld.merchant_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-bold">{ld.points}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          );
        })()}
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

      {/* Save Dialog */}
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

      {/* Cancel Edit Dialog */}
      <AlertDialog open={cancelEditDialogOpen} onOpenChange={setCancelEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bearbeitung beenden?</AlertDialogTitle>
            <AlertDialogDescription>Ungespeicherte Änderungen gehen verloren.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCancelEditDialogOpen(false); setIsEditing(false); setHasChanges(false); }}>Beenden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Accounts;
