import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Key } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "merchant",
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

      // Get emails from auth (we'll need to use a separate query or edge function)
      // For now, we'll combine the data we have
      const accountsData = roles?.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          id: role.user_id,
          email: "", // Will be populated separately
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

      toast.success(`Account erstellt! Temporäres Passwort: ${data.temporary_password}`);
      setDialogOpen(false);
      setFormData({ email: "", full_name: "", role: "merchant" });
      loadAccounts();
    } catch (error: any) {
      console.error("Fehler beim Erstellen des Accounts:", error);
      toast.error(error.message || "Fehler beim Erstellen des Accounts");
    } finally {
      setCreating(false);
    }
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
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.full_name}</TableCell>
                  <TableCell>{account.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={account.role === 'admin' ? 'default' : 'secondary'}>
                      {account.role === 'admin' ? 'Administrator' : 
                       account.role === 'customer' ? 'Kunde' :
                       account.role === 'merchant' ? 'Vertriebspartner' :
                       account.role === 'partner' ? 'Partner' : 
                       account.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {account.created_at ? new Date(account.created_at).toLocaleDateString('de-DE') : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Accounts;