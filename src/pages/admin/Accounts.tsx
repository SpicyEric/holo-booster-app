import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Edit, RotateCcw, Search, Filter, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AppRole = 'admin' | 'partner' | 'merchant' | 'customer' | 'end_customer';

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "end_customer" as AppRole,
    password: "",
  });

  const [editFormData, setEditFormData] = useState({
    full_name: "",
    role: "" as AppRole,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [accounts, searchTerm, roleFilter]);

  const applyFilters = () => {
    let filtered = [...accounts];

    // Search filter (name and email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.full_name?.toLowerCase().includes(term) ||
          a.email?.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((a) => a.role === roleFilter);
    }

    setFilteredAccounts(filtered);
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      // Get all user roles from Lovable Cloud
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");

      if (rolesError) throw rolesError;
      
      const roles = rolesData || [];

      // Get profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, full_name, created_at");

      if (profilesError) {
        console.error("Profiles error:", profilesError);
      }
      
      const profiles = profilesData || [];

      // Fetch emails via Edge Function
      const userIds = roles.map(r => r.user_id);
      let emails: Record<string, string> = {};
      if (userIds.length > 0) {
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('getUserEmails', {
            body: { userIds },
          });
          if (emailError) {
            console.error("Email fetch error:", emailError);
          } else {
            emails = emailData?.emails || {};
          }
        } catch (e) {
          console.error("Email fetch failed:", e);
        }
      }
      
      const accountsData = roles.map(role => {
        const profile = profiles.find(p => p.user_id === role.user_id);
        const fullName = profile?.full_name || 
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
          `User ${role.user_id.substring(0, 8)}`;
        
        return {
          id: role.user_id,
          email: emails[role.user_id] || "",
          full_name: fullName,
          role: role.role as AppRole,
          created_at: role.created_at || profile?.created_at || "",
        };
      });

      setAccounts(accountsData);
    } catch (error) {
      console.error("Fehler beim Laden der Accounts:", error);
      toast.error("Fehler beim Laden der Accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!formData.email || !formData.full_name) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    setCreating(true);

    try {
      // Create user in Lovable Cloud auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password || Math.random().toString(36).slice(-12),
        options: {
          data: {
            first_name: formData.full_name.split(' ')[0],
            last_name: formData.full_name.split(' ').slice(1).join(' '),
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Benutzer konnte nicht erstellt werden");

      // Add role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: authData.user.id, role: formData.role }]);

      if (roleError) throw roleError;

      toast.success("Account erstellt!");
      setDialogOpen(false);
      setFormData({ email: "", full_name: "", role: "end_customer", password: "" });
      loadAccounts();
    } catch (error: any) {
      console.error("Fehler beim Erstellen des Accounts:", error);
      toast.error(error.message || "Fehler beim Erstellen des Accounts");
    } finally {
      setCreating(false);
    }
  };

  const handleEditAccount = (account: UserAccount) => {
    setSelectedAccount(account);
    setEditFormData({
      full_name: account.full_name,
      role: account.role,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAccount) return;

    try {
      // Update profile
      const nameParts = editFormData.full_name.split(' ');
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ 
          user_id: selectedAccount.id,
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          full_name: editFormData.full_name,
        });

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Update role if changed
      if (editFormData.role !== selectedAccount.role) {
        // Delete old role
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedAccount.id);

        // Insert new role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{ user_id: selectedAccount.id, role: editFormData.role }]);

        if (roleError) throw roleError;
      }

      toast.success("Account aktualisiert");
      setEditDialogOpen(false);
      loadAccounts();
    } catch (error: any) {
      console.error("Fehler beim Aktualisieren:", error);
      toast.error("Fehler beim Aktualisieren des Accounts");
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    if (!email) {
      toast.error("Keine E-Mail-Adresse verfügbar");
      return;
    }
    
    try {
      // Find customer linked to this user to send proper onboarding email
      // First find the user_id for this email
      const account = accounts.find(a => a.email === email);
      if (!account) {
        toast.error("Account nicht gefunden");
        return;
      }

      // Check if this is a merchant - if so, send onboarding email with wizard
      if (account.role === 'merchant') {
        // Find the customer linked to this merchant
        const { data: customerUser } = await supabase
          .from("customer_users")
          .select("customer_id")
          .eq("user_id", account.id)
          .single();

        if (customerUser) {
          const { data: customer } = await supabase
            .from("customers")
            .select("id, name, company_name, email")
            .eq("id", customerUser.customer_id)
            .single();

          if (customer) {
            // Generate the password-setup-redirect URL (never expires)
            const passwordSetupUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-setup-redirect?cid=${encodeURIComponent(customer.id)}&email=${encodeURIComponent(email)}`;

            // Send onboarding email via edge function
            const { error: sendError } = await supabase.functions.invoke('send-merchant-onboarding', {
              body: {
                to: email,
                companyName: customer.company_name || customer.name,
                contactName: customer.name,
                passwordSetupUrl,
                // Don't pass customerId to skip idempotency check (allow re-sending)
              },
            });

            if (sendError) throw sendError;

            // Reset the onboarding_email_sent_at so it can be tracked
            await supabase
              .from("customers")
              .update({ onboarding_email_sent_at: new Date().toISOString() })
              .eq("id", customer.id);

            toast.success("Onboarding-E-Mail wurde erneut gesendet (mit Passwort-Setup & Wizard)");
            return;
          }
        }
      }

      // Fallback for non-merchant accounts: use password-setup-redirect directly
      // Generate recovery link via edge function
      const { data, error } = await supabase.functions.invoke('sendPasswordReset', {
        body: { email },
      });

      if (error) throw error;
      toast.success("Passwort-Reset-E-Mail wurde gesendet");
    } catch (error: any) {
      console.error("Fehler beim Senden:", error);
      toast.error("Fehler beim Senden der E-Mail");
    }
  };

  const handleDeleteAccount = (account: UserAccount) => {
    setSelectedAccount(account);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!selectedAccount) return;
    if (deleteConfirmText.toLowerCase() !== "löschen") {
      toast.error('Bitte gib "löschen" ein, um fortzufahren');
      return;
    }

    try {
      // Delete role first
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedAccount.id);

      // Delete profile
      await supabase
        .from("profiles")
        .delete()
        .eq("user_id", selectedAccount.id);

      // Delete the actual auth user via edge function
      const { data, error: deleteError } = await supabase.functions.invoke('deleteUserAccount', {
        body: { userId: selectedAccount.id },
      });

      if (deleteError) {
        console.error("Auth user deletion error:", deleteError);
        toast.error("Rolle entfernt, aber Auth-User konnte nicht gelöscht werden");
      } else {
        toast.success("Account vollständig gelöscht");
      }

      setDeleteDialogOpen(false);
      loadAccounts();
    } catch (error: any) {
      console.error("Fehler beim Löschen:", error);
      toast.error("Fehler beim Löschen des Accounts");
    }
  };

  const getRoleBadge = (role: AppRole) => {
    const roleMap: Record<AppRole, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      admin: { label: "Administrator", variant: "destructive" },
      merchant: { label: "Kunde (Händler)", variant: "default" },
      partner: { label: "Vertriebler", variant: "secondary" },
      customer: { label: "Kunde (Alt)", variant: "outline" },
      end_customer: { label: "Endkunde", variant: "outline" },
    };
    
    const config = roleMap[role] || { label: role, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Count accounts by role
  const roleCounts = {
    all: accounts.length,
    admin: accounts.filter(a => a.role === 'admin').length,
    merchant: accounts.filter(a => a.role === 'merchant').length,
    partner: accounts.filter(a => a.role === 'partner').length,
    end_customer: accounts.filter(a => a.role === 'end_customer').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Account-Verwaltung</h1>
          <p className="text-muted-foreground mt-2">
            {accounts.length} Accounts insgesamt • {roleCounts.admin} Admins • {roleCounts.merchant} Kunden • {roleCounts.end_customer} Endkunden
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Neuer Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Account erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie einen neuen Benutzer-Account.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="full_name">Vollständiger Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Rolle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end_customer">Endkunde</SelectItem>
                    <SelectItem value="merchant">Kunde (Händler)</SelectItem>
                    <SelectItem value="partner">Vertriebler</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="password">Passwort (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leer lassen für automatisches Passwort"
                />
              </div>
              
              <Button 
                onClick={handleCreateAccount} 
                disabled={creating}
                className="w-full"
              >
                Account erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Name oder E-Mail suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Rolle filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Rollen ({roleCounts.all})</SelectItem>
              <SelectItem value="admin">Admins ({roleCounts.admin})</SelectItem>
              <SelectItem value="merchant">Kunden ({roleCounts.merchant})</SelectItem>
              <SelectItem value="partner">Vertriebler ({roleCounts.partner})</SelectItem>
              <SelectItem value="end_customer">Endkunden ({roleCounts.end_customer})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 rounded-full bg-gradient-primary animate-pulse-glow" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {accounts.length === 0 
              ? "Keine Accounts gefunden" 
              : "Keine Accounts mit diesen Filterkriterien gefunden"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.full_name}</TableCell>
                  <TableCell>
                    {account.email ? (
                      <span className="text-sm">{account.email}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getRoleBadge(account.role)}</TableCell>
                  <TableCell>
                    {account.created_at ? new Date(account.created_at).toLocaleDateString('de-DE') : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAccount(account)}
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccount(account)}
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {account.email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendPasswordReset(account.email)}
                          title={account.role === 'merchant' ? "Onboarding-E-Mail erneut senden" : "Passwort zurücksetzen"}
                        >
                          {account.role === 'merchant' ? <Mail className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie den Account von {selectedAccount?.full_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit_full_name">Vollständiger Name</Label>
              <Input
                id="edit_full_name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_role">Rolle</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_customer">Endkunde</SelectItem>
                  <SelectItem value="merchant">Kunde (Händler)</SelectItem>
                  <SelectItem value="partner">Vertriebler</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleSaveEdit} className="w-full">
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Account von {selectedAccount?.full_name} wirklich löschen?
              Diese Aktion entfernt die Rolle des Benutzers.
              <div className="mt-4">
                <Label htmlFor="confirm">Bitte "löschen" eingeben:</Label>
                <Input
                  id="confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAccount}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Accounts;
