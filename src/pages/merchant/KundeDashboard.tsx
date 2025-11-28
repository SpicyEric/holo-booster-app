import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CreditCard, Star, User, ArrowRight, AlertTriangle, Pause } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  status: string;
  customer_number: number | null;
}

interface SubscriptionInfo {
  hasSubscription: boolean;
  status?: string;
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

export default function KundeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Willkommen zurück{customer?.company_name ? `, ${customer.company_name}` : ''}!
        </h1>
        <p className="text-muted-foreground">
          Hier ist eine Übersicht Ihres Eloyo-Kontos
        </p>
      </div>

      {/* Status Alerts */}
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

      {subscriptionInfo?.cancelAtPeriodEnd && subscriptionInfo.cancelAt && (
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

      {/* Quick Stats */}
      {subscriptionInfo?.hasSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Aktueller Tarif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Paket</p>
                <p className="text-xl font-bold">{subscriptionInfo.plan?.name || "Eloyo Basispaket"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Preis</p>
                <p className="text-xl font-bold">
                  {formatAmount(subscriptionInfo.plan?.amount || 0, subscriptionInfo.plan?.currency || "EUR")}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}/ {subscriptionInfo.plan?.interval === "month" ? "Monat" : "Jahr"}
                  </span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <div>{getStatusBadge(subscriptionInfo.status || customer?.status || "unknown")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/kunde/stempelkarte')}>
          <CardHeader className="pb-2">
            <CreditCard className="w-8 h-8 text-primary mb-2" />
            <CardTitle className="text-lg">Stempelkarte</CardTitle>
            <CardDescription>
              Bearbeiten Sie Ihr Profil und Ihre Standortdaten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="p-0 h-auto text-primary">
              Öffnen <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/kunde/google-bewertungen')}>
          <CardHeader className="pb-2">
            <Star className="w-8 h-8 text-primary mb-2" />
            <CardTitle className="text-lg">Google-Bewertungen</CardTitle>
            <CardDescription>
              Verwalten Sie Ihre Google-Bewertungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="p-0 h-auto text-primary">
              Öffnen <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/kunde/konto')}>
          <CardHeader className="pb-2">
            <User className="w-8 h-8 text-primary mb-2" />
            <CardTitle className="text-lg">Mein Konto</CardTitle>
            <CardDescription>
              Rechnungen, Zahlungsdaten und Einstellungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="p-0 h-auto text-primary">
              Öffnen <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Customer Info */}
      {customer?.customer_number && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Kundennummer: <span className="font-medium text-foreground">ELO-{String(customer.customer_number).padStart(5, '0')}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
