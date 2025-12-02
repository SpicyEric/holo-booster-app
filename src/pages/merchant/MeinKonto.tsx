import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound, Trash2, User, Mail } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Customer {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  customer_number: number | null;
}

export default function MeinKonto() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  
  // Dialogs
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Loading states
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: customerUser } = await supabase
        .from("customer_users")
        .select("customer_id")
        .eq("user_id", user?.id)
        .single();

      if (!customerUser) {
        // Try merchant_assignments
        const { data: assignment } = await supabase
          .from("merchant_assignments")
          .select("customer_id")
          .eq("merchant_user_id", user?.id)
          .single();

        if (assignment) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("id, name, email, company_name, customer_number")
            .eq("id", assignment.customer_id)
            .single();
          setCustomer(customerData);
        }
      } else {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id, name, email, company_name, customer_number")
          .eq("id", customerUser.customer_id)
          .single();
        setCustomer(customerData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Passwort erfolgreich geändert");
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error("Fehler beim Ändern des Passworts");
    } finally {
      setChangingPassword(false);
    }
  };

  const deleteAccount = async () => {
    if (!deleteConfirmed) {
      toast.error("Bitte bestätigen Sie die Löschung");
      return;
    }

    setDeleting(true);
    try {
      // Cancel subscription first if active
      try {
        await supabase.functions.invoke("cancel-subscription");
      } catch (e) {
        // Ignore if no subscription
      }

      // Sign out and show message
      await supabase.auth.signOut();
      toast.success("Löschungsanfrage wurde übermittelt. Ihr Account wird in Kürze gelöscht.");
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Fehler beim Löschen des Accounts");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Mein Konto</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Kontodaten und Sicherheitseinstellungen
        </p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Kontoinformationen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Geschäftsname</Label>
              <p className="font-medium">{customer?.name || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Kundennummer</Label>
              <p className="font-medium">{customer?.customer_number || "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{user?.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Passwort
          </CardTitle>
          <CardDescription>
            Ändern Sie Ihr Anmeldepasswort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
            Passwort ändern
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Account löschen
          </CardTitle>
          <CardDescription>
            Löschen Sie Ihren Account und alle damit verbundenen Daten dauerhaft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteDialog(true)}
          >
            Account löschen
          </Button>
        </CardContent>
      </Card>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
            <DialogDescription>
              Geben Sie ein neues Passwort ein (mindestens 6 Zeichen)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Neues Passwort</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>Passwort bestätigen</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={changePassword} disabled={changingPassword}>
              {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Daten 
              werden dauerhaft gelöscht. Ein aktives Abonnement wird automatisch gekündigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="delete-confirm"
              checked={deleteConfirmed}
              onCheckedChange={(checked) => setDeleteConfirmed(checked as boolean)}
            />
            <label
              htmlFor="delete-confirm"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ich verstehe, dass diese Aktion nicht rückgängig gemacht werden kann
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmed(false)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              disabled={!deleteConfirmed || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Account löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
