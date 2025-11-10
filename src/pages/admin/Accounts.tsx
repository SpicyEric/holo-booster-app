import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Key, Trash2, Edit, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "merchant",
    password: "",
  });

  const [editFormData, setEditFormData] = useState({
    full_name: "",
    role: "",
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, created_at")
        .in("user_id", roles?.map(r => r.user_id) || []);

      if (profilesError) throw profilesError;

      // Get emails from auth using edge function
      const userIds = roles?.map(r => r.user_id) || [];
      const { data: emailData, error: emailError } = await supabase.functions.invoke("getUserEmails", {
        body: { userIds }
      });

      if (emailError) {
        console.error("Error fetching emails:", emailError);
      }

      const emails = emailData?.emails || {};

      const accountsData = roles?.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          id: role.user_id,
          email: emails[role.user_id] || "",
          full_name: profile?.full_name || "",
          role: role.role,
          created_at: profile?.created_at || "",
        };
      }) || [];

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
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("createUserAccount", {
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      const message = formData.password 
        ? `Account erstellt!` 
        : `Account erstellt! Temporäres Passwort: ${data.temporary_password}`;
      toast.success(message);
      setDialogOpen(false);
      setFormData({ email: "", full_name: "", role: "merchant", password: "" });
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
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: editFormData.full_name })
        .eq("user_id", selectedAccount.id);

      if (profileError) throw profileError;

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
          .insert([{ user_id: selectedAccount.id, role: editFormData.role as any }]);

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
    try {
      const { error } = await supabase.functions.invoke("sendPasswordReset", {
        body: { email }
      });

      if (error) throw error;

      toast.success("Passwort-Reset-Link wurde generiert und kann dem Nutzer mitgeteilt werden");
    } catch (error: any) {
      console.error("Fehler beim Senden des Passwort-Resets:", error);
      toast.error("Fehler beim Senden des Passwort-Resets");
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
      const { error } = await supabase.functions.invoke("deleteUserAccount", {
        body: { userId: selectedAccount.id }
      });

      if (error) throw error;

      toast.success("Account erfolgreich gelöscht");
      setDeleteDialogOpen(false);
      loadAccounts();
    } catch (error: any) {
      console.error("Fehler beim Löschen:", error);
      toast.error("Fehler beim Löschen des Accounts");
    }
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      admin: { label: "Administrator", variant: "default" },
      merchant: { label: "Vertriebspartner", variant: "secondary" },
      customer: { label: "Kunde", variant: "outline" },
      partner: { label: "Partner", variant: "outline" },
    };
    
    const config = roleMap[role] || { label: role, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Account-Verwaltung</h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie Benutzer-Accounts und Rollen
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
                Erstellen Sie einen neuen Benutzer-Account für einen Admin oder Vertriebspartner.
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
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchant">Vertriebspartner</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="customer">Kunde</SelectItem>
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

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 rounded-full bg-gradient-primary animate-pulse-glow" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine Accounts gefunden
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
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.full_name}</TableCell>
                  <TableCell>{account.email || "—"}</TableCell>
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
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendPasswordReset(account.email)}
                        disabled={!account.email}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccount(account)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
              Bearbeiten Sie die Accountdaten von {selectedAccount?.full_name}
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
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merchant">Vertriebspartner</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="customer">Kunde</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Der Account von{" "}
              <strong>{selectedAccount?.full_name}</strong> wird permanent gelöscht.
              <div className="mt-4">
                <Label htmlFor="delete_confirm">
                  Bitte gib "löschen" ein, um fortzufahren:
                </Label>
                <Input
                  id="delete_confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="löschen"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Accounts;