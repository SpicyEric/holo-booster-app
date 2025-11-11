import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, LogOut, CreditCard, X, AlertTriangle, QrCode, Phone, Star, MessageSquare, FileText, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import qraitLogo from '@/assets/qrait-logo-full.png';
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
import Particles from "@/components/Particles";

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
  const [stats, setStats] = useState({
    totalScans: 0,
    totalContacts: 0,
    totalReviews: 0
  });
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);

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

      // Get statistics
      const customerId = customerUser.customer_id;

      // Get total scans
      const { count: scansCount } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId);

      // Get total contacts
      const { count: contactsCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .is("deleted_at", null);

      setStats({
        totalScans: scansCount || 0,
        totalContacts: contactsCount || 0,
        totalReviews: 0 // Placeholder for future implementation
      });

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
      
      <header className="border-b relative z-10 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={qraitLogo} alt="QRait Logo" className="h-10 w-auto" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                Mein Konto
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuItem onClick={() => setShowAccountInfo(true)}>
                <User className="mr-2 h-4 w-4" />
                Kontoinformationen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowInvoices(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Rechnungen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("SMS-Kampagnen - Kommt bald!")}>
                <MessageSquare className="mr-2 h-4 w-4" />
                SMS-Kampagnen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Google-Bewertungen löschen - Kommt bald!")}>
                <Star className="mr-2 h-4 w-4" />
                Google-Bewertungen löschen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Welcome Message */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Willkommen zurück!
          </h1>
          <p className="text-muted-foreground">
            Hier ist Ihre Erfolgsübersicht
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                QR-Code-Scans gesamt
              </CardTitle>
              <QrCode className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalScans}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Gesamtanzahl aller Scans
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hinterlegte Handynummern
              </CardTitle>
              <Phone className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalContacts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aktive Kontakte in Ihrer Datenbank
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Neue Bewertungen
              </CardTitle>
              <Star className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalReviews}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Kommt bald verfügbar
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Status - Only if active */}
        {subscriptionInfo?.hasSubscription && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ihr Abonnement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Paket</p>
                  <p className="font-medium text-lg">{subscriptionInfo.plan?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(subscriptionInfo.status || "unknown")}
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
            </CardContent>
          </Card>
        )}
      </main>

      {/* Account Info Dialog */}
      <AlertDialog open={showAccountInfo} onOpenChange={setShowAccountInfo}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Kontoinformationen</AlertDialogTitle>
            <AlertDialogDescription>
              Ihre Konto- und Abonnementdetails
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
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
            {subscriptionInfo?.hasSubscription && (
              <div className="pt-4 border-t space-y-4">
                <h3 className="font-semibold">Abonnement</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Paket</p>
                    <p className="font-medium">{subscriptionInfo.plan?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preis</p>
                    <p className="font-medium">
                      {formatAmount(subscriptionInfo.plan?.amount || 0, subscriptionInfo.plan?.currency || "EUR")} / {subscriptionInfo.plan?.interval === "month" ? "Monat" : "Jahr"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nächste Abrechnung</p>
                    <p className="font-medium">
                      {subscriptionInfo.currentPeriodEnd ? formatDate(subscriptionInfo.currentPeriodEnd) : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={openCustomerPortal} variant="outline" className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    Zahlungsmethoden verwalten
                  </Button>
                  {!subscriptionInfo.cancelAtPeriodEnd && (
                    <Button 
                      onClick={() => {
                        setShowAccountInfo(false);
                        setShowCancelDialog(true);
                      }} 
                      variant="outline"
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Abonnement kündigen
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Schließen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoices Dialog */}
      <AlertDialog open={showInvoices} onOpenChange={setShowInvoices}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Ihre Rechnungen</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Ihre bisherigen Rechnungen im Überblick
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            {invoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Keine Rechnungen vorhanden</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
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
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Schließen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
