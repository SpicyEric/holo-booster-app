import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, Gift, Package, CreditCard, Loader2, Tag, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

// Eloyo Produkte
const PRODUCTS = {
  startbox: {
    name: "Eloyo Startbox Basic",
    price: 149.45,
    description: "Alles was du brauchst um zu starten",
    features: [
      "1x NFC-Holzstempel",
      "Einrichtung & Onboarding",
      "Premium Support",
    ],
  },
  abo: {
    name: "Eloyo Abo",
    monthlyPrice: 49.45,
    yearlyPrice: 543.95, // 11 Monate * 49.45 = 543.95
    description: "Dein monatliches Abo für alle Eloyo-Features",
    features: [
      "Digitale Stempelkarte",
      "Dashboard-Zugang",
      "Kundenverwaltung",
      "Google Bewertungen",
      "Automatische Antworten",
    ],
  },
};

interface ValidatedDiscount {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'one_time' | 'recurring' | 'both';
}

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [isYearlyBilling, setIsYearlyBilling] = useState(false);
  
  // Customer data
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Deutschland");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [validatedDiscounts, setValidatedDiscounts] = useState<ValidatedDiscount[]>([]);

  const validatePromoCode = async () => {
    const codes = promoCodeInput.split(",").map(code => code.trim()).filter(Boolean);
    
    if (codes.length === 0) {
      toast.error("Bitte gib mindestens einen Rabattcode ein");
      return;
    }

    if (codes.length > 2) {
      toast.error("Maximal 2 Rabattcodes erlaubt");
      return;
    }

    // Check if codes are already validated
    const newCodes = codes.filter(code => 
      !validatedDiscounts.some(d => d.code.toUpperCase() === code.toUpperCase())
    );

    if (newCodes.length === 0) {
      toast.info("Diese Codes wurden bereits hinzugefügt");
      return;
    }

    setValidatingPromo(true);

    try {
      const results: ValidatedDiscount[] = [];
      
      for (const code of newCodes) {
        const { data, error } = await supabase.functions.invoke("validate-promo-code", {
          body: { code },
        });

        if (error) throw error;

        if (data.valid) {
          results.push({
            code: code.toUpperCase(),
            discountType: data.discountType,
            discountValue: data.discountValue,
            appliesTo: data.appliesTo,
          });
        } else {
          toast.error(`Code "${code}": ${data.error || "Ungültig"}`);
        }
      }

      if (results.length > 0) {
        const combined = [...validatedDiscounts, ...results].slice(0, 2);
        setValidatedDiscounts(combined);
        setPromoCodeInput("");
        toast.success(`${results.length} Rabattcode(s) erfolgreich angewendet!`);
      }
    } catch (error: any) {
      console.error("Promo validation error:", error);
      toast.error("Fehler bei der Validierung des Rabattcodes");
    } finally {
      setValidatingPromo(false);
    }
  };

  const removeDiscount = (code: string) => {
    setValidatedDiscounts(prev => prev.filter(d => d.code !== code));
    toast.info(`Rabattcode "${code}" entfernt`);
  };

  const calculateTotal = () => {
    const baseStartbox = PRODUCTS.startbox.price;
    const baseAbo = isYearlyBilling ? PRODUCTS.abo.yearlyPrice : PRODUCTS.abo.monthlyPrice;
    
    let startboxDiscount = 0;
    let aboDiscount = 0;

    for (const discount of validatedDiscounts) {
      // Calculate startbox discount (one_time or both)
      if (discount.appliesTo === 'one_time' || discount.appliesTo === 'both') {
        if (discount.discountType === 'percentage') {
          startboxDiscount += baseStartbox * (discount.discountValue / 100);
        } else {
          startboxDiscount += discount.discountValue;
        }
      }
      
      // Calculate abo discount (recurring or both)
      if (discount.appliesTo === 'recurring' || discount.appliesTo === 'both') {
        if (discount.discountType === 'percentage') {
          aboDiscount += baseAbo * (discount.discountValue / 100);
        } else {
          aboDiscount += discount.discountValue;
        }
      }
    }

    const finalStartbox = Math.max(0, baseStartbox - startboxDiscount);
    const finalAbo = Math.max(0, baseAbo - aboDiscount);
    const yearlySavings = isYearlyBilling ? (PRODUCTS.abo.monthlyPrice * 12) - PRODUCTS.abo.yearlyPrice : 0;

    return {
      startbox: baseStartbox,
      startboxDiscounted: finalStartbox,
      startboxDiscount,
      aboMonthly: isYearlyBilling ? finalAbo / 12 : finalAbo,
      aboTotal: finalAbo,
      aboDiscount,
      firstPayment: finalStartbox + finalAbo,
      savings: yearlySavings,
      totalDiscount: startboxDiscount + aboDiscount,
    };
  };

  const totals = calculateTotal();

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !customerEmail || !companyName) {
      toast.error("Bitte fülle alle Pflichtfelder aus");
      return;
    }

    if (!isValidEmail(customerEmail)) {
      toast.error("Bitte gib eine gültige E-Mail-Adresse ein");
      return;
    }

    setLoading(true);

    try {
      // Get session from Lovable Cloud (where user is authenticated)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        toast.error("Du musst eingeloggt sein um fortzufahren");
        navigate("/auth");
        return;
      }

      // Call edge function (JWT disabled, auth handled via ProtectedRoute)
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
            billingInterval: isYearlyBilling ? 'yearly' : 'monthly',
            promoCodes: validatedDiscounts.map(d => d.code),
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
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/customers")}
          className="mb-6"
        >
          ← Zurück zu Kunden
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Neuen Kunden abschließen</h1>
          <p className="text-muted-foreground">Startbox + Abo für deinen neuen Eloyo-Kunden</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Produkte */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Startbox */}
            <Card className="border-2 border-primary/50 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{PRODUCTS.startbox.name}</CardTitle>
                    <CardDescription>{PRODUCTS.startbox.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold">{PRODUCTS.startbox.price.toFixed(2)}€</span>
                  <span className="text-muted-foreground">einmalig</span>
                </div>
                <ul className="space-y-2">
                  {PRODUCTS.startbox.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Badge variant="outline" className="mt-4">
                  Pflicht
                </Badge>
              </CardContent>
            </Card>

            {/* Abo */}
            <Card className="border-2 border-primary/50 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{PRODUCTS.abo.name}</CardTitle>
                    <CardDescription>{PRODUCTS.abo.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  {isYearlyBilling ? (
                    <>
                      <span className="text-3xl font-bold">{(PRODUCTS.abo.yearlyPrice / 12).toFixed(2)}€</span>
                      <span className="text-muted-foreground">/Monat</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({PRODUCTS.abo.yearlyPrice.toFixed(2)}€/Jahr)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{PRODUCTS.abo.monthlyPrice.toFixed(2)}€</span>
                      <span className="text-muted-foreground">/Monat</span>
                    </>
                  )}
                </div>
                <ul className="space-y-2">
                  {PRODUCTS.abo.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Badge variant="outline" className="mt-4">
                  Pflicht
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Zahlungsintervall */}
          <Card>
            <CardHeader>
              <CardTitle>Zahlungsintervall</CardTitle>
              <CardDescription>Wähle zwischen monatlicher oder jährlicher Zahlung</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Label 
                  htmlFor="billing-toggle" 
                  className={`text-base font-medium cursor-pointer ${!isYearlyBilling ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  Monatlich
                </Label>
                <Switch
                  id="billing-toggle"
                  checked={isYearlyBilling}
                  onCheckedChange={setIsYearlyBilling}
                />
                <Label 
                  htmlFor="billing-toggle" 
                  className={`text-base font-medium cursor-pointer ${isYearlyBilling ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  Jährlich
                </Label>
                {isYearlyBilling && (
                  <Badge variant="default" className="ml-2 bg-green-500 hover:bg-green-600">
                    <Gift className="w-3 h-3 mr-1" />
                    1 Monat geschenkt ({totals.savings.toFixed(2)}€ sparen)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kundendaten */}
          <Card>
            <CardHeader>
              <CardTitle>Kundendaten</CardTitle>
              <CardDescription>Erfasse die Daten des neuen Kunden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Ansprechpartner *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Max Mustermann"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">E-Mail *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="max@beispiel.de"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Firmenname *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Musterfirma GmbH"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Straße & Hausnummer</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Musterstraße 123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">PLZ</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Musterstadt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Deutschland"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rabattcodes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Rabattcodes
              </CardTitle>
              <CardDescription>Maximal 2 Rabattcodes (werden kombiniert)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="promoCode"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="Rabattcode eingeben..."
                    disabled={validatedDiscounts.length >= 2 || validatingPromo}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        validatePromoCode();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={validatePromoCode}
                  disabled={validatedDiscounts.length >= 2 || validatingPromo || !promoCodeInput.trim()}
                  variant="secondary"
                >
                  {validatingPromo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Anwenden"
                  )}
                </Button>
              </div>

              {/* Angewendete Rabattcodes */}
              {validatedDiscounts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Angewendete Codes:</Label>
                  <div className="flex flex-wrap gap-2">
                    {validatedDiscounts.map((discount) => (
                      <Badge 
                        key={discount.code} 
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200"
                      >
                        <Check className="w-3 h-3" />
                        <span>{discount.code}</span>
                        <span className="text-xs opacity-75">
                          ({discount.discountType === 'percentage' ? `${discount.discountValue}%` : `${discount.discountValue}€`}
                          {discount.appliesTo === 'one_time' && ' auf Startbox'}
                          {discount.appliesTo === 'recurring' && ' auf Abo'}
                          {discount.appliesTo === 'both' && ' auf alles'})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDiscount(discount.code)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zusammenfassung */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Startbox */}
              <div className="flex justify-between items-center py-2 border-b">
                <span>Eloyo Startbox Basic</span>
                <div className="text-right">
                  {totals.startboxDiscount > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">{totals.startbox.toFixed(2)}€</span>
                      <span className="font-medium text-green-600">{totals.startboxDiscounted.toFixed(2)}€</span>
                    </div>
                  ) : (
                    <span className="font-medium">{totals.startbox.toFixed(2)}€</span>
                  )}
                </div>
              </div>

              {/* Abo */}
              <div className="flex justify-between items-center py-2 border-b">
                <span>
                  Eloyo Abo ({isYearlyBilling ? 'Jährlich' : 'Monatlich'})
                </span>
                <div className="text-right">
                  {totals.aboDiscount > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">
                        {(isYearlyBilling ? PRODUCTS.abo.yearlyPrice : PRODUCTS.abo.monthlyPrice).toFixed(2)}€
                      </span>
                      <span className="font-medium text-green-600">
                        {totals.aboTotal.toFixed(2)}€{isYearlyBilling ? '/Jahr' : '/Monat'}
                      </span>
                    </div>
                  ) : (
                    <span className="font-medium">
                      {totals.aboTotal.toFixed(2)}€{isYearlyBilling ? '/Jahr' : '/Monat'}
                    </span>
                  )}
                </div>
              </div>

              {/* Jährliche Ersparnis */}
              {isYearlyBilling && totals.savings > 0 && (
                <div className="flex justify-between items-center py-2 text-green-600">
                  <span>Ersparnis (1 Monat geschenkt)</span>
                  <span className="font-medium">-{totals.savings.toFixed(2)}€</span>
                </div>
              )}

              {/* Rabatt-Ersparnis */}
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between items-center py-2 text-green-600 bg-green-50 px-3 rounded-md">
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Rabatt ({validatedDiscounts.map(d => d.code).join(', ')})
                  </span>
                  <span className="font-medium">-{totals.totalDiscount.toFixed(2)}€</span>
                </div>
              )}

              {/* Gesamtsumme */}
              <div className="flex justify-between items-center py-3 border-t-2 text-lg font-bold">
                <span>Erste Zahlung</span>
                <span className={totals.totalDiscount > 0 ? "text-green-600" : ""}>
                  {totals.firstPayment.toFixed(2)}€
                </span>
              </div>

              {!isYearlyBilling && (
                <p className="text-sm text-muted-foreground">
                  Danach {totals.aboDiscount > 0 ? totals.aboTotal.toFixed(2) : PRODUCTS.abo.monthlyPrice.toFixed(2)}€/Monat
                </p>
              )}
              {isYearlyBilling && (
                <p className="text-sm text-muted-foreground">
                  Danach {totals.aboDiscount > 0 ? totals.aboTotal.toFixed(2) : PRODUCTS.abo.yearlyPrice.toFixed(2)}€/Jahr (11 Monate zahlen, 12 Monate nutzen)
                </p>
              )}
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full text-lg py-6"
            disabled={loading}
          >
            {loading ? "Wird erstellt..." : "Zur Kasse (Stripe Checkout)"}
          </Button>
        </form>
      </div>
    </div>
  );
}
