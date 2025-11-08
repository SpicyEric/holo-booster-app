import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, LogOut, CreditCard, X, AlertTriangle } from "lucide-react";
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

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  pdf_url: string | null;
  total_amount_cents: number;
  currency: string;
  status: string;
  issued_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  status: string;
  stripe_customer_id: string | null;
}

interface SubscriptionInfo {
  hasSubscription: boolean;
  status?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
  plan?: {
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

      // Get customer linked to this user
      const { data: customerUser } = await supabase
        .from("customer_users")
        .select("customer_id")
        .eq("user_id", user?.id)
        .single();

      if (!customerUser) {
        toast.error("Kein Kunde gefunden");
        return;
      }

      // Get customer details
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerUser.customer_id)
        .single();

      setCustomer(customerData);

      // Get invoices
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customerUser.customer_id)
        .order("issued_at", { ascending: false });

      setInvoices(invoicesData || []);

      // Get subscription info
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
      
      toast.success("Ihr Abonnement wird zum Ende der Laufzeit gekündigt");
      setShowCancelDialog(false);
      await loadData(); // Refresh data
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error("Fehler beim Kündigen des Abonnements");
    } finally {
      setCancelling(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
      case "past_due":
        return <Badge variant="destructive">Überfällig</Badge>;
      case "canceled":
        return <Badge variant="secondary">Gekündigt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">QRait Dashboard</h1>
            <p className="text-sm text-muted-foreground">{customer?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Subscription Info */}
        {subscriptionInfo?.hasSubscription && (
          <Card>
            <CardHeader>
              <CardTitle>Ihr Abonnement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Paket</p>
                  <p className="font-medium text-lg">{subscriptionInfo.plan?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Preis</p>
                  <p className="font-medium text-lg">
                    {formatAmount(subscriptionInfo.plan?.amount || 0, subscriptionInfo.plan?.currency || "EUR")} / {subscriptionInfo.plan?.interval === "month" ? "Monat" : "Jahr"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(subscriptionInfo.status || "unknown")}
                </div>
                <div>
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

              <div className="flex gap-2 pt-2">
                {!subscriptionInfo.cancelAtPeriodEnd && (
                  <Button 
                    onClick={() => setShowCancelDialog(true)} 
                    variant="outline"
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Abonnement kündigen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Ihre Kontoinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <p className="text-sm text-muted-foreground">Account-Status</p>
                {getStatusBadge(customer?.status || "unknown")}
              </div>
            </div>
            <div className="pt-4">
              <Button onClick={openCustomerPortal} variant="outline" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Zahlungsmethoden verwalten
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Ihre Rechnungen</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground">Keine Rechnungen vorhanden</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        Rechnung vom {formatDate(invoice.issued_at)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatAmount(invoice.total_amount_cents, invoice.currency)} •{" "}
                        <span className="capitalize">{invoice.status}</span>
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
      </main>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abonnement kündigen?</AlertDialogTitle>
            <AlertDialogDescription>
              Ihr Abonnement wird zum Ende der aktuellen Abrechnungsperiode gekündigt. Sie können alle Funktionen bis dahin weiter nutzen.
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
                  Wird gekündigt...
                </>
              ) : (
                "Jetzt kündigen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
