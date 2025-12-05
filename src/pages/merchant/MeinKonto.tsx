import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, KeyRound, Trash2, User, Mail, CreditCard, FileText, 
  Download, ExternalLink, Pause, XCircle 
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Customer {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  customer_number: number | null;
  status: string | null;
  stripe_subscription_id: string | null;
}

interface Invoice {
  id: string;
  stripe_invoice_id: string | null;
  total_amount_cents: number | null;
  currency: string | null;
  status: string | null;
  invoice_type: string | null;
  issued_at: string | null;
  pdf_url: string | null;
}

interface SubscriptionInfo {
  status: string;
  current_period_end: string | null;
  plan_name: string | null;
  amount: number | null;
  cancel_at_period_end: boolean;
}

export default function MeinKonto() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [pauseMonths, setPauseMonths] = useState('1');

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

      const { data: assignment } = await supabase
        .from("merchant_assignments")
        .select("customer_id")
        .eq("merchant_user_id", user?.id)
        .single();

      if (assignment) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id, name, email, company_name, customer_number, status, stripe_subscription_id")
          .eq("id", assignment.customer_id)
          .single();
        
        if (customerData) {
          setCustomer(customerData);

          // Load invoices
          const { data: invoiceData } = await supabase
            .from('invoices')
            .select('*')
            .eq('customer_id', assignment.customer_id)
            .order('issued_at', { ascending: false });

          if (invoiceData) {
            setInvoices(invoiceData);
          }

          // Load subscription info
          if (customerData.stripe_subscription_id) {
            try {
              const { data: subInfo } = await supabase.functions.invoke('get-subscription-info');
              if (subInfo) {
                setSubscription(subInfo);
              }
            } catch (error) {
              console.error('Error loading subscription:', error);
            }
          }
        }
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
      try {
        await supabase.functions.invoke("cancel-subscription");
      } catch (e) {
        // Ignore if no subscription
      }

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

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Fehler beim Öffnen des Kundenportals');
    }
  };

  const handlePauseSubscription = async () => {
    setProcessingAction(true);
    try {
      const { error } = await supabase.functions.invoke('pause-subscription', {
        body: { pauseMonths: parseInt(pauseMonths) }
      });
      if (error) throw error;
      toast.success(`Abo für ${pauseMonths} Monat(e) pausiert`);
      setShowPauseDialog(false);
      loadData();
    } catch (error) {
      console.error('Error pausing subscription:', error);
      toast.error('Fehler beim Pausieren');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelSubscription = async () => {
    setProcessingAction(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;
      toast.success('Abo wird zum Ende der Laufzeit gekündigt');
      setShowCancelDialog(false);
      loadData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Fehler beim Kündigen');
    } finally {
      setProcessingAction(false);
    }
  };

  const formatAmount = (cents: number | null, currency: string | null) => {
    if (!cents) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(cents / 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE');
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'paid': { variant: 'default', label: 'Bezahlt' },
      'open': { variant: 'secondary', label: 'Offen' },
      'void': { variant: 'outline', label: 'Storniert' },
      'uncollectible': { variant: 'destructive', label: 'Nicht einziehbar' },
    };
    const config = statusConfig[status || ''] || { variant: 'outline', label: status || '-' };
    return <Badge variant={config.variant} className="rounded-full">{config.label}</Badge>;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mein Konto</h1>
          <p className="text-gray-500 mt-1">
            Verwalten Sie Ihre Kontodaten, Abonnement und Rechnungen
          </p>
        </div>

        {/* Account Info */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              Kontoinformationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl">
                <Label className="text-xs text-gray-500">Geschäftsname</Label>
                <p className="font-semibold text-gray-900 mt-1">{customer?.name || "-"}</p>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <Label className="text-xs text-gray-500">Kundennummer</Label>
                <p className="font-semibold text-gray-900 mt-1">{customer?.customer_number || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl">
              <Mail className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{user?.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription / Zahlungen */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              Abonnement
            </CardTitle>
            <CardDescription className="text-gray-500">Ihr aktueller Tarif und Zahlungsstatus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Eloyo Abo</p>
                <p className="text-sm text-gray-500">
                  {subscription?.current_period_end 
                    ? `Nächste Zahlung: ${formatDate(subscription.current_period_end)}`
                    : 'Keine aktive Subscription'}
                </p>
              </div>
              <Badge 
                variant={customer?.status === 'active' ? 'default' : 'secondary'}
                className="rounded-full"
              >
                {customer?.status === 'active' ? 'Aktiv' : customer?.status === 'paused' ? 'Pausiert' : customer?.status || 'Unbekannt'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={openCustomerPortal} className="rounded-xl">
                <ExternalLink className="h-4 w-4 mr-2" />
                Zahlungsmethode ändern
              </Button>
              
              {customer?.status === 'active' && (
                <>
                  <Button variant="outline" onClick={() => setShowPauseDialog(true)} className="rounded-xl">
                    <Pause className="h-4 w-4 mr-2" />
                    Pausieren
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-destructive hover:text-destructive rounded-xl" 
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Kündigen
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              Rechnungen
            </CardTitle>
            <CardDescription className="text-gray-500">Alle Ihre Rechnungen zum Download</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Rechnungen vorhanden</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{formatDate(invoice.issued_at)}</p>
                        <p className="text-sm text-gray-500">
                          {invoice.invoice_type === 'subscription' ? 'Abo' : 'Einmalig'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-900">
                        {formatAmount(invoice.total_amount_cents, invoice.currency)}
                      </span>
                      {getStatusBadge(invoice.status)}
                      {invoice.pdf_url && (
                        <Button variant="ghost" size="sm" asChild className="rounded-lg">
                          <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-blue-600" />
              </div>
              Passwort
            </CardTitle>
            <CardDescription className="text-gray-500">
              Ändern Sie Ihr Anmeldepasswort
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setShowPasswordDialog(true)} className="rounded-xl">
              Passwort ändern
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="rounded-2xl shadow-sm border-0 bg-red-50/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-red-700">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              Account löschen
            </CardTitle>
            <CardDescription className="text-red-600/80">
              Löschen Sie Ihren Account und alle damit verbundenen Daten dauerhaft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              className="rounded-xl"
            >
              Account löschen
            </Button>
          </CardContent>
        </Card>

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Passwort ändern</DialogTitle>
              <DialogDescription>
                Geben Sie ein neues Passwort ein (mindestens 6 Zeichen)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700">Neues Passwort</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700">Passwort bestätigen</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="rounded-xl">
                Abbrechen
              </Button>
              <Button onClick={changePassword} disabled={changingPassword} className="rounded-xl">
                {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Account löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Daten 
                werden dauerhaft gelöscht. Ein aktives Abonnement wird automatisch gekündigt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center space-x-3 py-4">
              <Checkbox
                id="delete-confirm"
                checked={deleteConfirmed}
                onCheckedChange={(checked) => setDeleteConfirmed(checked as boolean)}
              />
              <label
                htmlFor="delete-confirm"
                className="text-sm font-medium leading-none"
              >
                Ich verstehe, dass diese Aktion nicht rückgängig gemacht werden kann
              </label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmed(false)} className="rounded-xl">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteAccount}
                disabled={!deleteConfirmed || deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Account löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Pause Dialog */}
        <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Abo pausieren</AlertDialogTitle>
              <AlertDialogDescription>
                Wie lange möchten Sie Ihr Abo pausieren?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Select value={pauseMonths} onValueChange={setPauseMonths}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Monat</SelectItem>
                <SelectItem value="2">2 Monate</SelectItem>
              </SelectContent>
            </Select>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handlePauseSubscription} disabled={processingAction} className="rounded-xl">
                {processingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Pausieren
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Abo kündigen</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie Ihr Abo wirklich kündigen? Es bleibt bis zum Ende der aktuellen Laufzeit aktiv.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelSubscription} 
                disabled={processingAction}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                {processingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Kündigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}