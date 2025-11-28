import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, CreditCard, X, AlertTriangle, KeyRound, Download, 
  User, FileText, Pause, Trash2, Settings
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import Particles from "@/components/Particles";
import { CustomerHeader } from "@/components/CustomerHeader";

interface Customer {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  status: string;
  customer_number: number | null;
}

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  pdf_url: string | null;
  total_amount_cents: number;
  currency: string;
  status: string;
  issued_at: string;
  invoice_type: string;
}

interface SubscriptionInfo {
  hasSubscription: boolean;
  status?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
  pausedUntil?: string | null;
  plan?: {
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

export default function CustomerAccount() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  
  // Dialogs
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPauseOption, setShowPauseOption] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Loading states
  const [cancelling, setCancelling] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form states
  const [pauseMonths, setPauseMonths] = useState(1);
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
        toast.error("Kein Kunde gefunden");
        return;
      }

      // Load customer data
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerUser.customer_id)
        .single();

      setCustomer(customerData);

      // Load invoices
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customerUser.customer_id)
        .order("issued_at", { ascending: false });

      setInvoices(invoicesData || []);

      // Load subscription info
      const { data: subInfo, error: subError } = await supabase.functions.invoke("get-subscription-info");
      if (!subError && subInfo) {
        setSubscriptionInfo(subInfo);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-customer-portal");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error("Fehler beim Öffnen des Portals");
    }
  };

  const cancelSubscription = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription");
      
      if (error) throw error;
      
      toast.success("Ihr Abonnement wird zum Ende der Laufzeit beendet");
      setShowCancelDialog(false);
      setShowPauseOption(false);
      await loadData();
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error("Fehler beim Beenden des Abonnements");
    } finally {
      setCancelling(false);
    }
  };

  const pauseSubscription = async () => {
    setPausing(true);
    try {
      const { data, error } = await supabase.functions.invoke("pause-subscription", {
        body: { pauseMonths }
      });
      
      if (error) throw error;
      
      toast.success(`Ihr Abonnement wurde für ${pauseMonths} ${pauseMonths === 1 ? 'Monat' : 'Monate'} pausiert`);
      setShowPauseOption(false);
      await loadData();
    } catch (error: any) {
      console.error("Error pausing subscription:", error);
      toast.error("Fehler beim Pausieren des Abonnements");
    } finally {
      setPausing(false);
    }
  };

  const handleCancelClick = () => {
    setShowPauseOption(true);
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
      if (subscriptionInfo?.hasSubscription && !subscriptionInfo.cancelAtPeriodEnd) {
        await supabase.functions.invoke("cancel-subscription");
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

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Aktiv</Badge>;
      case "paused":
        return <Badge variant="secondary" className="bg-amber-500 text-white">Pausiert</Badge>;
      case "past_due":
        return <Badge variant="destructive">Überfällig</Badge>;
      case "canceled":
        return <Badge variant="secondary">Gekündigt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInvoiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      subscription: "Abo",
      sms_campaign: "SMS-Kampagne",
      refund: "Erstattung",
      one_time: "Einmalig"
    };
    return labels[type] || type;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Particles 
        particleColors={['#8B5CF6', '#3B82F6', '#8B5CF6']}
        particleCount={100}
        particleSpread={8}
        speed={0.05}
        particleBaseSize={100}
        sizeRandomness={1.5}
        moveParticlesOnHover={true}
        alphaParticles={true}
        disableRotation={false}
        cameraDistance={20}
      />
      
      <CustomerHeader />

      <main className="container mx-auto px-4 py-8 space-y-6 relative z-10 max-w-4xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Mein Konto</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihr Abonnement, Zahlungsmethoden und Kontodaten
          </p>
        </div>

        <Tabs defaultValue="subscription" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="subscription" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Abonnement</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Rechnungen</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Einstellungen</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Abonnement */}
          <TabsContent value="subscription" className="space-y-6">
            {subscriptionInfo?.hasSubscription ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Aktueller Tarif</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Paket</p>
                        <p className="text-2xl font-bold">{subscriptionInfo.plan?.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Preis</p>
                        <p className="text-2xl font-bold">
                          {formatAmount(subscriptionInfo.plan?.amount || 0, subscriptionInfo.plan?.currency || "EUR")}
                          <span className="text-base font-normal text-muted-foreground">
                            {" "}/ {subscriptionInfo.plan?.interval === "month" ? "Monat" : "Jahr"}
                          </span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div>{getStatusBadge(subscriptionInfo.status || customer?.status || "unknown")}</div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Nächste Abrechnung</p>
                        <p className="font-medium">
                          {subscriptionInfo.currentPeriodEnd ? formatDate(subscriptionInfo.currentPeriodEnd) : "-"}
                        </p>
                      </div>
                    </div>
                    
                    {subscriptionInfo.cancelAtPeriodEnd && subscriptionInfo.cancelAt && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-900 dark:text-amber-100">Kündigung eingereicht</p>
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                              Ihr Abonnement endet am {formatDate(subscriptionInfo.cancelAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {customer?.status === "paused" && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Pause className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-900 dark:text-amber-100">Abo pausiert</p>
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                              Ihr Abonnement ist pausiert. Während der Pause sind Sie nicht in der Endkunden-App sichtbar.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Zahlungsmittel</CardTitle>
                    <CardDescription>
                      Verwalten Sie Ihre Zahlungsmethoden über das Stripe-Portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={openCustomerPortal} variant="outline" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Zahlungsmethoden verwalten
                    </Button>
                  </CardContent>
                </Card>

                {!subscriptionInfo.cancelAtPeriodEnd && (
                  <Card className="border-destructive/20">
                    <CardHeader>
                      <CardTitle>Abo beenden</CardTitle>
                      <CardDescription>
                        Sie können Ihr Abo pausieren oder dauerhaft beenden
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={handleCancelClick} 
                        variant="outline"
                        className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                        Abo beenden
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Kein aktives Abonnement vorhanden</p>
                  <Button onClick={() => navigate("/customer/upgrade")} className="mt-4">
                    Jetzt abonnieren
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Rechnungen */}
          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Rechnungen</CardTitle>
                <CardDescription>
                  Alle Rechnungen als PDF herunterladen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Keine Rechnungen vorhanden
                  </p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">
                              Rechnung vom {formatDate(invoice.issued_at)}
                            </p>
                            <span 
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                invoice.invoice_type === 'refund' 
                                  ? 'bg-destructive/10 text-destructive' 
                                  : invoice.invoice_type === 'sms_campaign'
                                  ? 'bg-secondary text-secondary-foreground'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {getInvoiceTypeLabel(invoice.invoice_type)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatAmount(invoice.total_amount_cents, invoice.currency)} •{" "}
                            <span className="capitalize">{invoice.status === "paid" ? "Bezahlt" : invoice.status}</span>
                          </p>
                        </div>
                        {invoice.pdf_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(invoice.pdf_url!, "_blank")}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Einstellungen */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Kontodaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Kundennummer</p>
                    <p className="font-medium font-mono">#{customer?.customer_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{customer?.name}</p>
                  </div>
                  {customer?.company_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Firma</p>
                      <p className="font-medium">{customer?.company_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">E-Mail</p>
                    <p className="font-medium">{customer?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Sicherheit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowPasswordDialog(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <KeyRound className="h-4 w-4" />
                  Passwort ändern
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Account löschen
                </CardTitle>
                <CardDescription>
                  Wenn Sie Ihren Eloyo-Account dauerhaft löschen, werden alle zugehörigen 
                  Daten, Standorte und Kundenbeziehungen endgültig entfernt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Account löschen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Pause Option Dialog */}
      <Dialog open={showPauseOption} onOpenChange={setShowPauseOption}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5" />
              Möchten Sie Ihr Abo pausieren?
            </DialogTitle>
            <DialogDescription>
              Bevor Sie Ihr Abo beenden, haben Sie die Möglichkeit, es vorübergehend zu pausieren. 
              Während der Pause werden Sie nicht in der Endkunden-App angezeigt und es werden keine 
              Beträge abgebucht.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium mb-2">Abo pausieren</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Wählen Sie die Pause-Dauer (max. 2 Monate):
              </p>
              <RadioGroup 
                value={pauseMonths.toString()} 
                onValueChange={(v) => setPauseMonths(parseInt(v))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="pause-1" />
                  <Label htmlFor="pause-1">1 Monat</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="pause-2" />
                  <Label htmlFor="pause-2">2 Monate</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>• Ihre Daten bleiben erhalten</p>
              <p>• Keine Abbuchungen während der Pause</p>
              <p>• Automatische Reaktivierung nach Ablauf</p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={pauseSubscription}
              disabled={pausing}
              className="gap-2"
            >
              {pausing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird pausiert...
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Abo für {pauseMonths} {pauseMonths === 1 ? 'Monat' : 'Monate'} pausieren
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowPauseOption(false);
                setShowCancelDialog(true);
              }}
              disabled={pausing}
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              Nein, Abo beenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abo wirklich beenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Abo wird zum Ende Ihres bereits bezahlten Zeitraums beendet. 
              Sie sind ab dann nicht mehr sichtbar, und es werden keine weiteren 
              Beträge abgebucht. Ihre Daten bleiben vorerst gespeichert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={cancelSubscription}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird beendet...
                </>
              ) : (
                "Abo endgültig beenden"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Passwort ändern</AlertDialogTitle>
            <AlertDialogDescription>
              Geben Sie Ihr neues Passwort ein (mindestens 6 Zeichen).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort"
                disabled={changingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort bestätigen"
                disabled={changingPassword}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changingPassword}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={changePassword}
              disabled={changingPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird geändert...
                </>
              ) : (
                "Passwort ändern"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Account endgültig löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Daten, 
              Standorte und Kundenbeziehungen werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="delete-confirm" 
                checked={deleteConfirmed}
                onCheckedChange={(checked) => setDeleteConfirmed(checked as boolean)}
              />
              <label 
                htmlFor="delete-confirm" 
                className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
              >
                Ich verstehe, dass alle meine Daten und Endkunden-Zugehörigkeiten 
                endgültig gelöscht werden.
              </label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteConfirmed(false)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteAccount}
              disabled={deleting || !deleteConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                "Account endgültig löschen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
