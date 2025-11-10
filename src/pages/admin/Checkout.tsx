import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, ChevronDown, ChevronUp, Minus, Plus, Star } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type PackageType = 'basic' | 'plus' | 'pro';

interface PackageDetails {
  name: string;
  monthlyPrice: number;
  setupPrice: number;
  features: { name: string; included: boolean; value?: string }[];
  cardFeatures: string[]; // Simple list for the package cards
  highlight?: boolean;
}

const PACKAGES: Record<PackageType, PackageDetails> = {
  basic: {
    name: "Basic",
    monthlyPrice: 44.00,
    setupPrice: 179.00,
    cardFeatures: [
      'Premium Support',
      'QR-Bewertungssystem',
      'Dashboard-Zugang'
    ],
    features: [
      { name: "Premium-Support", included: true },
      { name: "Aufsteller inklusive", included: true, value: "1 Aufsteller inklusive" },
      { name: "Individuelles Design", included: false },
      { name: "QR-Code Bewertungssystem", included: true },
      { name: "Dashboard-Zugang (Statistiken & Kontakte)", included: true },
      { name: "Digitale Stempelkarte", included: false },
      { name: "SMS-Aktionsmodul (Werbe-SMS an Kunden)", included: false },
      { name: "Mehrere Standorte (je eigener QR-Code)", included: false },
    ]
  },
  plus: {
    name: "Plus",
    monthlyPrice: 49.00,
    setupPrice: 199.00,
    highlight: true,
    cardFeatures: [
      'Alles was Basic hat, plus:',
      'Digitale Stempelkarte',
      'SMS-Aktionsmodul',
      '2 Aufsteller inklusive'
    ],
    features: [
      { name: "Premium-Support", included: true },
      { name: "Aufsteller inklusive", included: true, value: "2 Aufsteller inklusive" },
      { name: "Individuelles Design", included: true, value: "✓ (1 Design inklusive)" },
      { name: "QR-Code Bewertungssystem", included: true },
      { name: "Dashboard-Zugang (Statistiken & Kontakte)", included: true },
      { name: "Digitale Stempelkarte", included: true },
      { name: "SMS-Aktionsmodul (Werbe-SMS an Kunden)", included: true },
      { name: "Mehrere Standorte (je eigener QR-Code)", included: false },
    ]
  },
  pro: {
    name: "Pro",
    monthlyPrice: 59.00,
    setupPrice: 249.00,
    cardFeatures: [
      'Alles was Plus hat, plus:',
      'Laufend neue Designs möglich',
      'Mehrere Standorte',
      '4 Aufsteller inklusive'
    ],
    features: [
      { name: "Premium-Support", included: true },
      { name: "Aufsteller inklusive", included: true, value: "4 Aufsteller inklusive" },
      { name: "Individuelles Design", included: true, value: "✓ (laufend neue Designs möglich, bis zu 2 pro Jahr)" },
      { name: "QR-Code Bewertungssystem", included: true },
      { name: "Dashboard-Zugang (Statistiken & Kontakte)", included: true },
      { name: "Digitale Stempelkarte", included: true },
      { name: "SMS-Aktionsmodul (Werbe-SMS an Kunden)", included: true },
      { name: "Mehrere Standorte (je eigener QR-Code)", included: true, value: "✓ (bis zu 3 Standorte inklusive)" },
    ]
  }
};

const EXTRA_DISPLAY_PRICE = 6.50;

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('plus');
  const [showComparison, setShowComparison] = useState(false);
  const [extraDisplays, setExtraDisplays] = useState(0);
  
  // Customer data
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Deutschland");
  const [promoCodes, setPromoCodes] = useState("");

  const selectedPackageDetails = PACKAGES[selectedPackage];
  
  const calculateTotal = () => {
    const monthly = selectedPackageDetails.monthlyPrice;
    const setup = selectedPackageDetails.setupPrice;
    const extraDisplaysCost = extraDisplays * EXTRA_DISPLAY_PRICE;
    return {
      monthly,
      setup,
      extraDisplays: extraDisplaysCost,
      firstPayment: setup + monthly + extraDisplaysCost
    };
  };

  const totals = calculateTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !customerEmail || !companyName) {
      toast.error("Bitte fülle alle Pflichtfelder aus");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            customerName,
            customerEmail,
            companyName,
            address: {
              street,
              city,
              postalCode,
              country,
            },
            packageType: selectedPackage,
            extraDisplays,
            promoCodes: promoCodes ? promoCodes.split(",").map(code => code.trim()) : [],
          },
        }
      );

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success("Checkout-Session erstellt!");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Fehler beim Erstellen der Checkout-Session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/customers")}
          className="mb-6"
        >
          ← Zurück zu Kunden
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Neuen Kunden abschließen</h1>
          <p className="text-muted-foreground">Wähle ein Paket und erfasse die Kundendaten</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Package Selection */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Paket auswählen</CardTitle>
              <CardDescription>Wähle das passende QRait-Paket für deinen Kunden</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {(Object.keys(PACKAGES) as PackageType[]).map((packageType) => {
                  const pkg = PACKAGES[packageType];
                  const isSelected = selectedPackage === packageType;
                  
                  return (
                    <Card
                      key={packageType}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary border-2 shadow-lg ring-2 ring-primary/20' 
                          : 'hover:border-primary/50'
                      } ${pkg.highlight ? 'relative' : ''}`}
                      onClick={() => setSelectedPackage(packageType)}
                    >
                      {pkg.highlight && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-primary-foreground" />
                          Meistgewählt
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                        <div className="space-y-1">
                          <div className="text-3xl font-bold">{pkg.monthlyPrice.toFixed(2)}€</div>
                          <div className="text-sm text-muted-foreground">pro Monat</div>
                          <div className="text-sm font-semibold text-primary">
                            + {pkg.setupPrice.toFixed(2)}€ einmalig
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {pkg.cardFeatures.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              {idx === 0 && packageType !== 'basic' ? (
                                <span className="text-muted-foreground font-medium">{feature}</span>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Collapsible Comparison Table */}
              <Collapsible open={showComparison} onOpenChange={setShowComparison}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {showComparison ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Vergleichstabelle ausblenden
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Detaillierte Vergleichstabelle anzeigen
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6">
                  <div className="bg-muted/30 rounded-lg p-6">
                    <div className="mb-6 flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Star className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-2xl font-bold">QRait Paketübersicht</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse bg-background rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left p-4 font-semibold border-r border-border w-1/4">
                              Funktion / Leistung
                            </th>
                            <th className="text-center p-4 font-semibold border-r border-border">
                              Basic
                            </th>
                            <th className="text-center p-4 font-semibold bg-primary/10 border-r border-border relative">
                              <div className="flex items-center justify-center gap-2">
                                Plus
                                <Star className="w-4 h-4 text-primary fill-primary" />
                              </div>
                            </th>
                            <th className="text-center p-4 font-semibold">
                              Pro
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {PACKAGES.basic.features.map((_, idx) => {
                            const basicFeature = PACKAGES.basic.features[idx];
                            const plusFeature = PACKAGES.plus.features[idx];
                            const proFeature = PACKAGES.pro.features[idx];
                            
                            return (
                              <tr key={idx} className="border-t border-border hover:bg-muted/30 transition-colors">
                                <td className="p-4 font-medium border-r border-border">
                                  {basicFeature.name}
                                </td>
                                <td className="text-center p-4 border-r border-border">
                                  {basicFeature.included ? (
                                    basicFeature.value ? (
                                      <span className="text-sm font-medium">{basicFeature.value}</span>
                                    ) : (
                                      <Check className="h-5 w-5 text-primary mx-auto" />
                                    )
                                  ) : (
                                    <X className="h-5 w-5 text-destructive mx-auto" />
                                  )}
                                </td>
                                <td className="text-center p-4 bg-primary/5 border-r border-border">
                                  {plusFeature.included ? (
                                    plusFeature.value ? (
                                      <span className="text-sm font-medium">{plusFeature.value}</span>
                                    ) : (
                                      <Check className="h-5 w-5 text-primary mx-auto" />
                                    )
                                  ) : (
                                    <X className="h-5 w-5 text-destructive mx-auto" />
                                  )}
                                </td>
                                <td className="text-center p-4">
                                  {proFeature.included ? (
                                    proFeature.value ? (
                                      <span className="text-sm font-medium">{proFeature.value}</span>
                                    ) : (
                                      <Check className="h-5 w-5 text-primary mx-auto" />
                                    )
                                  ) : (
                                    <X className="h-5 w-5 text-destructive mx-auto" />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          
                          {/* Pricing Rows */}
                          <tr className="border-t-2 border-border bg-muted/30">
                            <td className="p-4 font-semibold border-r border-border">
                              Setup-Gebühr (einmalig)
                            </td>
                            <td className="text-center p-4 font-bold border-r border-border">
                              {PACKAGES.basic.setupPrice} €
                            </td>
                            <td className="text-center p-4 font-bold bg-primary/10 border-r border-border">
                              {PACKAGES.plus.setupPrice} €
                            </td>
                            <td className="text-center p-4 font-bold">
                              {PACKAGES.pro.setupPrice} €
                            </td>
                          </tr>
                          <tr className="border-t border-border bg-muted/30">
                            <td className="p-4 font-semibold border-r border-border">
                              Monatlicher Preis
                            </td>
                            <td className="text-center p-4 font-bold border-r border-border">
                              {PACKAGES.basic.monthlyPrice} € / Monat
                            </td>
                            <td className="text-center p-4 font-bold bg-primary/10 border-r border-border">
                              {PACKAGES.plus.monthlyPrice} € / Monat
                            </td>
                            <td className="text-center p-4 font-bold">
                              {PACKAGES.pro.monthlyPrice} € / Monat
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Plus Package Highlight */}
                    <div className="mt-6 bg-primary/10 border-l-4 border-primary rounded-r-lg p-4">
                      <div className="flex items-start gap-3">
                        <Star className="w-6 h-6 text-primary fill-primary flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                            Plus = Meistgewähltes Paket
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Der ideale Standard: zwei Aufsteller, individuelles Design, digitale Stempelkarte und 
                            SMS-Aktionsmodul – perfekt für aktive Betriebe, die mit Bewertungen & 
                            Kundenbindung durchstarten wollen.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Customer Data */}
          <Card>
            <CardHeader>
              <CardTitle>Kundendaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Firmenname *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerName">Ansprechpartner *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail">E-Mail-Adresse *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="street">Straße und Hausnummer</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="postalCode">PLZ</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add-ons */}
          <Card>
            <CardHeader>
              <CardTitle>Zusatzoptionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-semibold">Extra Holzaufsteller</div>
                  <div className="text-sm text-muted-foreground">
                    {EXTRA_DISPLAY_PRICE.toFixed(2)}€ pro Stück
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setExtraDisplays(Math.max(0, extraDisplays - 1))}
                    disabled={extraDisplays === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold">{extraDisplays}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setExtraDisplays(extraDisplays + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="promoCodes">Rabattcodes (max. 2, mit Komma trennen)</Label>
                <Input
                  id="promoCodes"
                  value={promoCodes}
                  onChange={(e) => setPromoCodes(e.target.value)}
                  placeholder="z.B. WELCOME2024, SPECIAL10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Price Summary - Sticky */}
          <div className="lg:fixed lg:top-24 lg:right-8 lg:w-80">
            <Card className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
              <CardHeader>
                <CardTitle>Kostenübersicht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{selectedPackageDetails.name} (monatlich)</span>
                    <span className="font-semibold">{totals.monthly.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Setup-Gebühr (einmalig)</span>
                    <span className="font-semibold">{totals.setup.toFixed(2)}€</span>
                  </div>
                  {extraDisplays > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Extra Aufsteller ({extraDisplays}x)</span>
                      <span className="font-semibold">{totals.extraDisplays.toFixed(2)}€</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Erste Zahlung</span>
                    <span className="text-primary">{totals.firstPayment.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Dann monatlich</span>
                    <span>{totals.monthly.toFixed(2)}€</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  <p>✓ Monatlich kündbar</p>
                  <p>✓ 14 Tage Widerrufsrecht</p>
                  <p>✓ Sichere Zahlung über Stripe</p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Lädt..." : "Zur Zahlung"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/admin/customers")}
                >
                  Abbrechen
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
