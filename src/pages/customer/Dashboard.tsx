import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CreditCard, X, AlertTriangle, QrCode, Phone, Star, Download, Clock } from "lucide-react";
import { CustomerHeader } from "@/components/CustomerHeader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
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
  google_access_token?: string | null;
  auto_reply_enabled?: boolean;
  auto_reply_daily_time?: string;
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
  const [googleLinked, setGoogleLinked] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyTime, setAutoReplyTime] = useState("18:00");
  const [savingSettings, setSavingSettings] = useState(false);
  const [showAutoReplySettings, setShowAutoReplySettings] = useState(false);

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

      // Check if Google is linked
      if (customerData?.google_access_token) {
        console.log('[Dashboard] Google account linked:', {
          hasToken: !!customerData.google_access_token,
          autoReplyEnabled: customerData.auto_reply_enabled,
          autoReplyTime: customerData.auto_reply_daily_time
        });
        setGoogleLinked(true);
        setAutoReplyEnabled(customerData.auto_reply_enabled || false);
        setAutoReplyTime(customerData.auto_reply_daily_time || "18:00");
        
        // Load reviews
        await loadReviews(customerUser.customer_id);
      } else {
        console.log('[Dashboard] Google account not linked');
        setGoogleLinked(false);
        setAutoReplyEnabled(false);
      }

      // Get statistics
      const customerId = customerUser.customer_id;

      // Get scans from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: scansCount } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .gte("created_at", sevenDaysAgo.toISOString());

      // Get total contacts
      const { count: contactsCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .is("deleted_at", null);

      setStats({
        totalScans: scansCount || 0,
        totalContacts: contactsCount || 0,
        totalReviews: reviews.length
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

  const loadReviews = async (customerId: string) => {
    if (!customerId) {
      console.log('[Dashboard] No customer ID provided');
      return;
    }

    try {
      setLoadingReviews(true);
      console.log('[Dashboard] Loading reviews for customer:', customerId);
      
      const { data, error } = await supabase.functions.invoke("fetch-google-reviews", {
        body: { customer_id: customerId }
      });

      if (error) {
        console.error("[Dashboard] Error loading reviews:", error);
        
        // Check if it's an API permission error
        if (error.message?.includes('SERVICE_DISABLED') || error.message?.includes('PERMISSION_DENIED')) {
          toast.error(
            "Google APIs sind nicht aktiviert. Bitte aktivieren Sie die Google My Business APIs in Ihrem Google Cloud Projekt.",
            { duration: 8000 }
          );
        } else if (error.message?.includes('No business account found')) {
          toast.error("Kein Google Business Profil gefunden. Stellen Sie sicher, dass Sie ein Google Business Profil haben.");
        } else {
          toast.error("Fehler beim Laden der Bewertungen: " + (error.message || "Unbekannter Fehler"));
        }
        
        setLoadingReviews(false);
        return;
      }

      console.log('[Dashboard] Reviews data received:', data);

      // Check for error in response data
      if (data?.error) {
        console.error("[Dashboard] Error in response:", data.error);
        
        if (data.error.includes('SERVICE_DISABLED') || data.error.includes('PERMISSION_DENIED')) {
          toast.error(
            "⚠️ Google APIs müssen aktiviert werden!\n\nBitte aktivieren Sie folgende APIs in der Google Cloud Console:\n- My Business Account Management API\n- My Business Business Information API\n- My Business Reviews API",
            { duration: 10000 }
          );
        } else {
          toast.error("Fehler: " + data.error);
        }
        
        setLoadingReviews(false);
        return;
      }

      // Use allReviews for dashboard display
      if (data?.allReviews && Array.isArray(data.allReviews)) {
        const formattedReviews = data.allReviews.map((review: any) => ({
          ...review,
          stars: review.starRating === "FIVE" ? 5 : 
                 review.starRating === "FOUR" ? 4 :
                 review.starRating === "THREE" ? 3 :
                 review.starRating === "TWO" ? 2 : 1,
        }));
        setReviews(formattedReviews.slice(0, 5));
        setStats(prev => ({ ...prev, totalReviews: data.allReviews.length }));
        console.log('[Dashboard] Reviews loaded successfully:', formattedReviews.length);
      } else {
        console.log('[Dashboard] No reviews found or wrong format');
        setReviews([]);
      }
    } catch (error: any) {
      console.error("[Dashboard] Exception loading reviews:", error);
      toast.error("Fehler beim Laden der Bewertungen: " + (error.message || "Unbekannter Fehler"));
    } finally {
      setLoadingReviews(false);
    }
  };

  const saveAutoReplySettings = async () => {
    if (!customer?.id) {
      console.error('[Dashboard] No customer ID, cannot save');
      toast.error("Kein Kunde gefunden");
      return;
    }

    setSavingSettings(true);
    
    try {
      console.log('[Dashboard] Saving auto-reply settings:', { 
        customerId: customer.id,
        autoReplyEnabled, 
        autoReplyTime 
      });

      // Calculate next run time
      const now = new Date();
      const [hours, minutes] = autoReplyTime.split(':');
      const nextRun = new Date(now.toDateString() + ' ' + autoReplyTime);
      if (nextRun < now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      const updateData = {
        auto_reply_enabled: autoReplyEnabled,
        auto_reply_daily_time: autoReplyTime,
        last_auto_reply_check: autoReplyEnabled ? new Date().toISOString() : null,
        next_auto_reply_run: autoReplyEnabled ? nextRun.toISOString() : null,
      };

      console.log('[Dashboard] Update data:', updateData);

      const { data: result, error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", customer.id)
        .select();

      if (error) {
        console.error('[Dashboard] Error saving settings:', error);
        throw error;
      }

      console.log('[Dashboard] Settings saved successfully, result:', result);
      
      // Update local state to reflect the saved values
      if (result && result.length > 0) {
        setCustomer(prev => prev ? { ...prev, ...result[0] } : null);
      }
      
      toast.success("Einstellungen erfolgreich gespeichert");
      setShowAutoReplySettings(false);
      
      // Small delay to ensure UI updates
      setTimeout(() => {
        console.log('[Dashboard] Current state after save:', { autoReplyEnabled, autoReplyTime });
      }, 100);
    } catch (error: any) {
      console.error("[Dashboard] Exception saving settings:", error);
      toast.error("Fehler beim Speichern der Einstellungen: " + (error.message || "Unbekannter Fehler"));
    } finally {
      setSavingSettings(false);
    }
  };

  const startGoogleOAuth = () => {
    if (!customer?.id) {
      toast.error("Kein Kunde gefunden");
      return;
    }
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const redirectUrl = `${supabaseUrl}/functions/v1/google-oauth-callback?customer_id=${customer.id}`;
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    const scope = "https://www.googleapis.com/auth/business.manage";
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    window.location.href = authUrl;
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
      
      <CustomerHeader />

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
                QR-Code-Scans
              </CardTitle>
              <QrCode className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalScans}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Letzte 7 Tage
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
                Gesamt
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
                {googleLinked ? "Letzte 30 Tage" : "Google-Konto verknüpfen"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Google Reviews Section */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Google Bewertungen
              </CardTitle>
              {googleLinked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAutoReplySettings(true)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Auto-Reply Einstellungen
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!googleLinked ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-muted-foreground">
                  Verknüpfen Sie Ihr Google-Konto, um Ihre Bewertungen hier zu sehen
                  und automatisch auf positive Bewertungen zu antworten.
                </div>
                <Button
                  size="lg"
                  onClick={startGoogleOAuth}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  Google-Konto jetzt verknüpfen
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {autoReplyEnabled && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Auto-Reply aktiviert</div>
                      <div className="text-sm text-muted-foreground">
                        Tägliche Ausführung um {autoReplyTime} Uhr
                      </div>
                    </div>
                  </div>
                )}

                {loadingReviews ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((review: any) => (
                      <div
                        key={review.reviewId}
                        className="border rounded-lg p-4 space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{review.reviewer?.displayName || "Unbekannt"}</div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: parseInt(review.starRating?.replace(/\D/g, "") || "0") }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                        <p className="text-xs text-muted-foreground">
                          {review.createTime ? new Date(review.createTime).toLocaleDateString("de-DE") : ""}
                        </p>
                        {review.reviewReply && (
                          <div className="bg-muted/50 rounded p-3 mt-2">
                            <p className="text-sm font-medium mb-1">Ihre Antwort:</p>
                            <p className="text-sm text-muted-foreground">{review.reviewReply.comment}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Noch keine Bewertungen vorhanden
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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

      {/* Auto-Reply Settings Dialog */}
      <Dialog open={showAutoReplySettings} onOpenChange={setShowAutoReplySettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Reply Einstellungen</DialogTitle>
            <DialogDescription>
              Lassen Sie Q-Rait automatisch auf 4-5 Sterne Google-Bewertungen antworten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reply-toggle" className="flex flex-col gap-1">
                <span className="font-medium">Auto-Reply aktivieren</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Automatische Antworten auf positive Bewertungen
                </span>
              </Label>
              <Switch
                id="auto-reply-toggle"
                checked={autoReplyEnabled}
                onCheckedChange={setAutoReplyEnabled}
              />
            </div>

            {autoReplyEnabled && (
              <div className="space-y-2">
                <Label htmlFor="auto-reply-time">Tägliche Ausführungszeit</Label>
                <Input
                  id="auto-reply-time"
                  type="time"
                  value={autoReplyTime}
                  onChange={(e) => setAutoReplyTime(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Q-Rait prüft täglich zu dieser Uhrzeit auf neue Bewertungen und antwortet automatisch.
                </p>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="font-medium text-sm">Standardantwort:</div>
              <p className="text-sm text-muted-foreground">
                "{`{Name}`}, vielen Dank für deine positive Bewertung! 😊 Wir freuen uns sehr, dass du zufrieden bist."
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAutoReplySettings(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveAutoReplySettings} disabled={savingSettings}>
              {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
