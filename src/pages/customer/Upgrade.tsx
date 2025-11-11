import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Check, Zap, Star, Rocket, ArrowRight, Package, Palette, ShoppingCart, Clock, Phone } from "lucide-react";
import Particles from "@/components/Particles";
import { CustomerHeader } from "@/components/CustomerHeader";
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

interface SubscriptionInfo {
  hasSubscription: boolean;
  status?: string;
  plan?: {
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

const PACKAGES = {
  basic: {
    id: "basic",
    name: "QRait Basic",
    price: 44,
    icon: Check,
    color: "text-blue-500",
    popular: false,
    features: [
      "1 Aufsteller inklusive",
      "QR-Bewertungs-Flow",
      "Dashboard-Statistiken",
      "Premium-Support"
    ]
  },
  plus: {
    id: "plus",
    name: "QRait Plus",
    price: 49,
    icon: Zap,
    color: "text-purple-500",
    popular: true,
    features: [
      "2 Aufsteller inklusive",
      "1 individuelles Design",
      "Digitale Stempelkarte",
      "SMS-Aktionsmodul",
      "Premium-Support"
    ]
  },
  pro: {
    id: "pro",
    name: "QRait Pro",
    price: 59,
    icon: Rocket,
    color: "text-amber-500",
    popular: false,
    features: [
      "4 Aufsteller inklusive",
      "Laufend neue Designs (bis zu 2/Jahr)",
      "Digitale Stempelkarte",
      "SMS-Modul",
      "Bis zu 3 Standorte",
      "Priority Support"
    ]
  }
};

export default function CustomerUpgrade() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [currentPackage, setCurrentPackage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [aufstellerQuantity, setAufstellerQuantity] = useState(1);
  const [designQuantity, setDesignQuantity] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadSubscriptionInfo();
    }
  }, [user]);

  useEffect(() => {
    // Check for order success/cancel in URL
    const orderSuccess = searchParams.get('order_success');
    const orderCancelled = searchParams.get('order_cancelled');
    
    if (orderSuccess) {
      toast.success("Bestellung erfolgreich abgeschlossen!");
      // Remove query params
      navigate('/customer/upgrade', { replace: true });
    } else if (orderCancelled) {
      toast.info("Bestellung wurde abgebrochen");
      navigate('/customer/upgrade', { replace: true });
    }
  }, [searchParams, navigate]);

  const loadSubscriptionInfo = async () => {
    try {
      setLoading(true);
      const { data: subInfo, error } = await supabase.functions.invoke("get-subscription-info");
      
      if (error) throw error;
      
      if (subInfo) {
        setSubscriptionInfo(subInfo);
        
        // Determine current package based on plan name
        const planName = subInfo.plan?.name?.toLowerCase() || "";
        if (planName.includes("basic")) setCurrentPackage("basic");
        else if (planName.includes("plus")) setCurrentPackage("plus");
        else if (planName.includes("pro")) setCurrentPackage("pro");
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
      toast.error("Fehler beim Laden der Abo-Informationen");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = (packageId: string) => {
    if (packageId === currentPackage) {
      toast.info("Sie nutzen bereits dieses Paket");
      return;
    }
    setSelectedPackage(packageId);
    setShowConfirmDialog(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPackage) return;

    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("upgrade-subscription", {
        body: { targetPackage: selectedPackage }
      });

      if (error) throw error;

      toast.success(`Erfolgreich auf ${PACKAGES[selectedPackage as keyof typeof PACKAGES].name} gewechselt!`);
      setShowConfirmDialog(false);
      await loadSubscriptionInfo();
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast.error(error.message || "Fehler beim Paket-Wechsel");
    } finally {
      setUpgrading(false);
    }
  };

  const handleOrderAufsteller = async () => {
    if (aufstellerQuantity < 1 || aufstellerQuantity > 10) {
      toast.error("Bitte wählen Sie zwischen 1 und 10 Aufstellern");
      return;
    }

    setOrdering(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-order-payment", {
        body: { 
          orderType: "aufsteller",
          quantity: aufstellerQuantity
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Stripe-Checkout wurde geöffnet");
      }
    } catch (error: any) {
      console.error("Order error:", error);
      toast.error(error.message || "Fehler bei der Bestellung");
    } finally {
      setOrdering(false);
    }
  };

  const handleOrderDesign = async () => {
    if (designQuantity < 1 || designQuantity > 5) {
      toast.error("Bitte wählen Sie zwischen 1 und 5 Designs");
      return;
    }

    setOrdering(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-order-payment", {
        body: { 
          orderType: "design",
          quantity: designQuantity
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Stripe-Checkout wurde geöffnet");
      }
    } catch (error: any) {
      console.error("Order error:", error);
      toast.error(error.message || "Fehler bei der Bestellung");
    } finally {
      setOrdering(false);
    }
  };

  const isUpgrade = (packageId: string) => {
    const order = ["basic", "plus", "pro"];
    const currentIndex = order.indexOf(currentPackage || "");
    const targetIndex = order.indexOf(packageId);
    return targetIndex > currentIndex;
  };

  const isDowngrade = (packageId: string) => {
    const order = ["basic", "plus", "pro"];
    const currentIndex = order.indexOf(currentPackage || "");
    const targetIndex = order.indexOf(packageId);
    return targetIndex < currentIndex;
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

      <main className="container mx-auto px-4 py-8 space-y-8 relative z-10 max-w-7xl">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Paket wechseln</h1>
          <p className="text-muted-foreground">
            Wählen Sie das perfekte Paket für Ihr Geschäft
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(PACKAGES).map((pkg) => {
            const Icon = pkg.icon;
            const isCurrent = currentPackage === pkg.id;
            const canUpgrade = isUpgrade(pkg.id);
            const canDowngrade = isDowngrade(pkg.id);

            return (
              <Card 
                key={pkg.id} 
                className={`relative ${isCurrent ? 'ring-2 ring-primary' : ''} ${pkg.popular ? 'border-primary' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Beliebteste Wahl
                    </Badge>
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default">Ihr aktuelles Paket</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-6 w-6 ${pkg.color}`} />
                    <CardTitle>{pkg.name}</CardTitle>
                  </div>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {pkg.price}€
                    </span>
                    <span className="text-muted-foreground"> / Monat</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleUpgradeClick(pkg.id)}
                    disabled={isCurrent || upgrading}
                    variant={canUpgrade ? "default" : "outline"}
                    className="w-full gap-2"
                  >
                    {isCurrent ? (
                      "Aktuelles Paket"
                    ) : canUpgrade ? (
                      <>
                        Upgraden <ArrowRight className="h-4 w-4" />
                      </>
                    ) : canDowngrade ? (
                      "Downgraden"
                    ) : (
                      "Auswählen"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Wichtige Informationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Bei einem Upgrade wird die Differenz anteilig berechnet und sofort abgebucht.</p>
            <p>• Bei einem Downgrade erhalten Sie eine anteilige Gutschrift für die nächste Rechnung.</p>
            <p>• Die Änderung wird sofort wirksam.</p>
            <p>• Ihr Abrechnungszyklus bleibt unverändert.</p>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <div className="text-center space-y-2 mb-6">
          <h2 className="text-3xl font-bold">Zusätzliche Bestellungen</h2>
          <p className="text-muted-foreground">
            Bestellen Sie weitere Aufsteller oder individuelle Designs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aufsteller Bestellung */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Extra-Aufsteller</CardTitle>
                  <CardDescription>Holz-Aufsteller mit QR-Code</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                6,50€ <span className="text-base font-normal text-muted-foreground">/ Stück</span>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Lieferung innerhalb von 7 Werktagen</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Inklusive Ihrer aktuellen Designs</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Hochwertiger Holzfuß</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aufsteller-quantity">Anzahl</Label>
                <Input
                  id="aufsteller-quantity"
                  type="number"
                  min="1"
                  max="10"
                  value={aufstellerQuantity}
                  onChange={(e) => setAufstellerQuantity(parseInt(e.target.value) || 1)}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Gesamt:</span>
                  <span className="text-lg font-bold">
                    {(aufstellerQuantity * 6.50).toFixed(2)}€
                  </span>
                </div>
              </div>

              <Button
                onClick={handleOrderAufsteller}
                disabled={ordering || aufstellerQuantity < 1}
                className="w-full gap-2"
              >
                {ordering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wird verarbeitet...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Jetzt bestellen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Design Bestellung */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Palette className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle>Individuelles Design</CardTitle>
                  <CardDescription>Maßgeschneidertes Aufsteller-Design</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                29,95€ <span className="text-base font-normal text-muted-foreground">/ Design</span>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Kontaktaufnahme innerhalb von 48 Stunden</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Design-Briefing & Abstimmung</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Anpassungen bis zur finalen Freigabe</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="design-quantity">Anzahl</Label>
                <Input
                  id="design-quantity"
                  type="number"
                  min="1"
                  max="5"
                  value={designQuantity}
                  onChange={(e) => setDesignQuantity(parseInt(e.target.value) || 1)}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Gesamt:</span>
                  <span className="text-lg font-bold">
                    {(designQuantity * 29.95).toFixed(2)}€
                  </span>
                </div>
              </div>

              <Button
                onClick={handleOrderDesign}
                disabled={ordering || designQuantity < 1}
                className="w-full gap-2"
                variant="secondary"
              >
                {ordering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wird verarbeitet...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Jetzt bestellen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50 mt-6">
          <CardHeader>
            <CardTitle>Wichtige Informationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Paket-Upgrade:</strong></p>
            <p>• Bei einem Upgrade wird die Differenz anteilig berechnet und sofort abgebucht.</p>
            <p>• Bei einem Downgrade erhalten Sie eine anteilige Gutschrift für die nächste Rechnung.</p>
            <p className="pt-2"><strong>Bestellungen:</strong></p>
            <p>• Alle Bestellungen werden sofort per Stripe bezahlt.</p>
            <p>• Sie erhalten eine Bestätigung per E-Mail.</p>
            <p>• Bestellungen werden in Ihrem Admin-Dashboard angezeigt.</p>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Paket-Wechsel bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPackage && (
                <div className="space-y-2 mt-4">
                  <p>
                    Sie wechseln zu <strong>{PACKAGES[selectedPackage as keyof typeof PACKAGES].name}</strong> für{" "}
                    <strong>{PACKAGES[selectedPackage as keyof typeof PACKAGES].price}€/Monat</strong>.
                  </p>
                  {isUpgrade(selectedPackage) && (
                    <p className="text-sm text-muted-foreground">
                      Die Differenz zum aktuellen Paket wird anteilig berechnet und sofort abgebucht.
                    </p>
                  )}
                  {isDowngrade(selectedPackage) && (
                    <p className="text-sm text-muted-foreground">
                      Sie erhalten eine anteilige Gutschrift für die nächste Rechnung.
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={upgrading}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUpgrade}
              disabled={upgrading}
            >
              {upgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gewechselt...
                </>
              ) : (
                "Jetzt wechseln"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
