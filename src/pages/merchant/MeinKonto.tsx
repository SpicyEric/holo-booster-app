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
  User, FileText, Pause, Trash2, Settings, Package, Save
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

interface Customer {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  status: string;
  customer_number: number | null;
}

interface CustomerBox {
  id: string;
  box_id: string;
  assigned_at: string;
  box_code: string;
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

export default function MeinKonto() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerBoxes, setCustomerBoxes] = useState<CustomerBox[]>([]);
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
  const [newBoxId, setNewBoxId] = useState("");
  const [savingBoxId, setSavingBoxId] = useState(false);

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

      // Load customer boxes
      const { data: boxesData } = await supabase
        .from("customer_boxes")
        .select(`
          id,
          box_id,
          assigned_at,
          boxes:box_id (box_id)
        `)
        .eq("customer_id", customerUser.customer_id)
        .order("assigned_at", { ascending: false });

      const mappedBoxes: CustomerBox[] = (boxesData || []).map((b: any) => ({
        id: b.id,
        box_id: b.box_id,
        assigned_at: b.assigned_at,
        box_code: b.boxes?.box_id || "Unbekannt"
      }));
      setCustomerBoxes(mappedBoxes);

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

  const formatBoxIdInput = (value: string) => {
    // Remove all non-alphanumeric characters
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    // Insert dashes every 5 characters
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join("-");
  };

  const handleBoxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBoxId(formatBoxIdInput(e.target.value));
  };

  const saveBoxId = async () => {
    if (!customer?.id || !newBoxId) return;
    
    const cleanId = newBoxId.replace(/-/g, "");
    if (cleanId.length !== 15) {
      toast.error("Box-ID muss genau 15 Zeichen haben (XXXXX-XXXXX-XXXXX)");
      return;
    }
    
    setSavingBoxId(true);
    try {
      // Check if box exists in boxes table
      const { data: boxData, error: boxError } = await supabase
        .from("boxes")
        .select("id, box_id")
        .eq("box_id", newBoxId)
        .maybeSingle();

      if (boxError) throw boxError;

      if (!boxData) {
        toast.error("Diese Box-ID ist nicht gültig. Bitte überprüfen Sie die Eingabe.");
        setSavingBoxId(false);
        return;
      }

      // Check if already assigned to this customer
      const { data: existingAssignment } = await supabase
        .from("customer_boxes")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("box_id", boxData.id)
        .maybeSingle();

      if (existingAssignment) {
        toast.error("Diese Box-ID ist bereits mit Ihrem Konto verknüpft.");
        setSavingBoxId(false);
        return;
      }

      // Check if assigned to another customer
      const { data: otherAssignment } = await supabase
        .from("customer_boxes")
        .select("id")
        .eq("box_id", boxData.id)
        .maybeSingle();

      if (otherAssignment) {
        toast.error("Diese Box-ID ist bereits einem anderen Konto zugewiesen.");
        setSavingBoxId(false);
        return;
      }

      // Assign box to customer
      const { error: assignError } = await supabase
        .from("customer_boxes")
        .insert({
          customer_id: customer.id,
          box_id: boxData.id
        });

      if (assignError) throw assignError;

      toast.success("Box-ID wurde erfolgreich hinzugefügt");
      setNewBoxId("");
      
      // Reload customer boxes
      const { data: updatedBoxes } = await supabase
        .from("customer_boxes")
        .select(`
          id,
          box_id,
          assigned_at,
          boxes:box_id (box_id)
        `)
        .eq("customer_id", customer.id)
        .order("assigned_at", { ascending: false });

      const mappedBoxes: CustomerBox[] = (updatedBoxes || []).map((b: any) => ({
        id: b.id,
        box_id: b.box_id,
        assigned_at: b.assigned_at,
        box_code: b.boxes?.box_id || "Unbekannt"
      }));
      setCustomerBoxes(mappedBoxes);
    } catch (error: any) {
      console.error("Error saving box ID:", error);
      toast.error("Fehler beim Speichern der Box-ID");
    } finally {
      setSavingBoxId(false);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
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
                          <span className="font-medium">
                            {formatDate(invoice.issued_at)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getInvoiceTypeLabel(invoice.invoice_type || 'subscription')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatAmount(invoice.total_amount_cents || 0, invoice.currency || 'EUR')}</span>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.status === 'paid' ? 'Bezahlt' : invoice.status}
                          </Badge>
                        </div>
                      </div>
                      {invoice.pdf_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(invoice.pdf_url!, '_blank')}
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
                <Package className="h-5 w-5" />
                Box-ID
              </CardTitle>
              <CardDescription>
                Verknüpfen Sie Ihre Eloyo Starterbox mit Ihrem Konto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Already assigned boxes */}
              {customerBoxes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ihre verknüpften Boxen:</p>
                  <div className="space-y-2">
                    {customerBoxes.map((box) => (
                      <div 
                        key={box.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-mono font-medium">{box.box_code}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Hinzugefügt am {new Date(box.assigned_at).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new box */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">
                  {customerBoxes.length > 0 ? "Weitere Box hinzufügen:" : "Box-ID eingeben:"}
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      id="box-id"
                      value={newBoxId}
                      onChange={handleBoxIdChange}
                      placeholder="XXXXX-XXXXX-XXXXX"
                      className="font-mono"
                      maxLength={17}
                    />
                  </div>
                  <Button 
                    onClick={saveBoxId} 
                    disabled={savingBoxId || newBoxId.replace(/-/g, "").length !== 15}
                    className="gap-2"
                  >
                    {savingBoxId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Hinzufügen
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Die Box-ID finden Sie auf der Innenseite des Deckels Ihrer Starterbox.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kontodaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer?.customer_number && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Kundennummer</p>
                  <p className="font-medium">ELO-{String(customer.customer_number).padStart(5, '0')}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Firmenname</p>
                <p className="font-medium">{customer?.company_name || customer?.name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">E-Mail</p>
                <p className="font-medium">{user?.email || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passwort ändern</CardTitle>
              <CardDescription>
                Ändern Sie Ihr Login-Passwort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPasswordDialog(true)} variant="outline" className="gap-2">
                <KeyRound className="h-4 w-4" />
                Passwort ändern
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Account dauerhaft löschen - diese Aktion kann nicht rückgängig gemacht werden
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

      {/* Pause Option Dialog */}
      <Dialog open={showPauseOption} onOpenChange={setShowPauseOption}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abo beenden</DialogTitle>
            <DialogDescription>
              Möchten Sie Ihr Abo stattdessen pausieren? Während der Pause werden keine Gebühren erhoben.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">Abo pausieren (empfohlen)</p>
              <p className="text-sm text-muted-foreground mb-4">
                Ihr Abo wird für die gewählte Dauer pausiert. Danach wird es automatisch wieder aktiviert.
              </p>
              <RadioGroup value={String(pauseMonths)} onValueChange={(v) => setPauseMonths(Number(v))}>
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
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={pauseSubscription}
              disabled={pausing}
              className="w-full sm:w-auto"
            >
              {pausing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
              Abo pausieren
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowPauseOption(false);
                setShowCancelDialog(true);
              }}
              className="w-full sm:w-auto border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              Nein, Abo beenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abo wirklich beenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Ihr Abonnement wird zum Ende des aktuellen Abrechnungszeitraums beendet. 
              Sie können den Service bis dahin weiterhin nutzen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelSubscription}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ja, Abo beenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
            <DialogDescription>
              Geben Sie ein neues Passwort ein
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={changePassword} disabled={changingPassword}>
              {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Passwort ändern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Account dauerhaft löschen</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Wenn Sie Ihren Eloyo-Account dauerhaft löschen, werden alle zugehörigen Daten, 
                Standorte und Kundenbeziehungen endgültig entfernt. Diese Aktion kann nicht 
                rückgängig gemacht werden.
              </p>
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="delete-confirm"
                  checked={deleteConfirmed}
                  onCheckedChange={(checked) => setDeleteConfirmed(checked === true)}
                />
                <label
                  htmlFor="delete-confirm"
                  className="text-sm leading-tight cursor-pointer"
                >
                  Ich verstehe, dass alle meine Daten und Endkunden-Zugehörigkeiten endgültig 
                  gelöscht werden.
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmed(false)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              disabled={!deleteConfirmed || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Account endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
