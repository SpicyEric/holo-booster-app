import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Check, Gift, Package, CreditCard, Loader2, Tag, X, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const PRODUCTS = {
  startbox: {
    name: "Eloyo Startbox Basic",
    price: 149.45,
    description: "Alles was du brauchst um zu starten",
    features: ["1x NFC-Holzstempel", "Einrichtung & Onboarding", "Premium Support"],
  },
  abo: {
    name: "Eloyo Abo",
    monthlyPrice: 49.45,
    yearlyPrice: 543.95,
    description: "Dein monatliches Abo für alle Eloyo-Features",
    features: ["Digitale Stempelkarte", "Dashboard-Zugang", "Kundenverwaltung", "Google Bewertungen", "Automatische Antworten"],
  },
};

interface ValidatedDiscount {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'one_time' | 'recurring' | 'both';
}

export default function PartnerCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [isYearlyBilling, setIsYearlyBilling] = useState(false);

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
    const codes = promoCodeInput.split(",").map(c => c.trim()).filter(Boolean);
    if (codes.length === 0) { toast.error("Bitte gib einen Rabattcode ein"); return; }
    if (codes.length > 2) { toast.error("Max. 2 Rabattcodes"); return; }

    const newCodes = codes.filter(c => !validatedDiscounts.some(d => d.code.toUpperCase() === c.toUpperCase()));
    if (newCodes.length === 0) { toast.info("Codes bereits hinzugefügt"); return; }

    setValidatingPromo(true);
    try {
      const results: ValidatedDiscount[] = [];
      for (const code of newCodes) {
        const { data, error } = await supabase.functions.invoke("validate-promo-code", { body: { code } });
        if (error) throw error;
        if (data.valid) {
          results.push({ code: code.toUpperCase(), discountType: data.discountType, discountValue: data.discountValue, appliesTo: data.appliesTo });
        } else {
          toast.error(`Code "${code}": ${data.error || "Ungültig"}`);
        }
      }
      if (results.length > 0) {
        setValidatedDiscounts(prev => [...prev, ...results].slice(0, 2));
        setPromoCodeInput("");
        toast.success(`${results.length} Rabattcode(s) angewendet!`);
      }
    } catch {
      toast.error("Fehler bei der Validierung");
    } finally {
      setValidatingPromo(false);
    }
  };

  const removeDiscount = (code: string) => {
    setValidatedDiscounts(prev => prev.filter(d => d.code !== code));
  };

  const calculateTotal = () => {
    const baseStartbox = PRODUCTS.startbox.price;
    const baseAbo = isYearlyBilling ? PRODUCTS.abo.yearlyPrice : PRODUCTS.abo.monthlyPrice;
    let startboxDiscount = 0, aboDiscount = 0;

    for (const d of validatedDiscounts) {
      if (d.appliesTo === 'one_time' || d.appliesTo === 'both') {
        startboxDiscount += d.discountType === 'percentage' ? baseStartbox * (d.discountValue / 100) : d.discountValue;
      }
      if (d.appliesTo === 'recurring' || d.appliesTo === 'both') {
        aboDiscount += d.discountType === 'percentage' ? baseAbo * (d.discountValue / 100) : d.discountValue;
      }
    }

    const finalStartbox = Math.max(0, baseStartbox - startboxDiscount);
    const finalAbo = Math.max(0, baseAbo - aboDiscount);
    const savings = isYearlyBilling ? (PRODUCTS.abo.monthlyPrice * 12) - PRODUCTS.abo.yearlyPrice : 0;

    return {
      startbox: baseStartbox, startboxDiscounted: finalStartbox, startboxDiscount,
      aboTotal: finalAbo, aboDiscount,
      firstPayment: finalStartbox + finalAbo,
      savings, totalDiscount: startboxDiscount + aboDiscount,
    };
  };

  const totals = calculateTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !companyName) { toast.error("Bitte fülle alle Pflichtfelder aus"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customerEmail)) { toast.error("Ungültige E-Mail"); return; }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { toast.error("Nicht eingeloggt"); navigate("/auth"); return; }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          customerName, customerEmail, companyName,
          address: { street, city, postalCode, country },
          billingInterval: isYearlyBilling ? 'yearly' : 'monthly',
          promoCodes: validatedDiscounts.map(d => d.code),
          partnerUserId: user?.id, // Track which partner made this sale
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success("Checkout-Session erstellt!");
      }
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen der Checkout-Session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/partner/dashboard')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Button>

      <div className="text-center">
        <h1 className="text-3xl font-bold">Neuen Kunden abschließen</h1>
        <p className="text-muted-foreground">Startbox + Abo für deinen neuen Eloyo-Kunden</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
        {/* Products */}
        <div className="grid lg:grid-cols-2 gap-6">
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
                {PRODUCTS.startbox.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" />{f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

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
                    <span className="text-muted-foreground">/Monat ({PRODUCTS.abo.yearlyPrice.toFixed(2)}€/Jahr)</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold">{PRODUCTS.abo.monthlyPrice.toFixed(2)}€</span>
                    <span className="text-muted-foreground">/Monat</span>
                  </>
                )}
              </div>
              <ul className="space-y-2">
                {PRODUCTS.abo.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" />{f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Billing interval */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Label className={`cursor-pointer ${!isYearlyBilling ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Monatlich</Label>
              <Switch checked={isYearlyBilling} onCheckedChange={setIsYearlyBilling} />
              <Label className={`cursor-pointer ${isYearlyBilling ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Jährlich</Label>
              {isYearlyBilling && (
                <Badge className="bg-green-500 hover:bg-green-600"><Gift className="w-3 h-3 mr-1" />{totals.savings.toFixed(2)}€ sparen</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer data */}
        <Card>
          <CardHeader><CardTitle>Kundendaten</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Ansprechpartner *</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Max Mustermann" required /></div>
              <div className="space-y-2"><Label>E-Mail *</Label><Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="max@beispiel.de" required /></div>
            </div>
            <div className="space-y-2"><Label>Firmenname *</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Musterfirma GmbH" required /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Straße & Hausnummer</Label><Input value={street} onChange={e => setStreet(e.target.value)} /></div>
              <div className="space-y-2"><Label>PLZ</Label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Stadt</Label><Input value={city} onChange={e => setCity(e.target.value)} /></div>
              <div className="space-y-2"><Label>Land</Label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Promo codes */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" />Rabattcodes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={promoCodeInput} onChange={e => setPromoCodeInput(e.target.value)} placeholder="Rabattcode..." disabled={validatedDiscounts.length >= 2}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); validatePromoCode(); } }} />
              <Button type="button" onClick={validatePromoCode} disabled={validatedDiscounts.length >= 2 || validatingPromo || !promoCodeInput.trim()} variant="secondary">
                {validatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Anwenden"}
              </Button>
            </div>
            {validatedDiscounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {validatedDiscounts.map(d => (
                  <Badge key={d.code} className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800">
                    <Check className="w-3 h-3" />{d.code}
                    <span className="text-xs opacity-75">({d.discountType === 'percentage' ? `${d.discountValue}%` : `${d.discountValue}€`})</span>
                    <button type="button" onClick={() => removeDiscount(d.code)}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-2 border-primary">
          <CardHeader><CardTitle>Zusammenfassung</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span>Startbox</span>
              <span className="font-medium">{totals.startboxDiscounted.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Abo ({isYearlyBilling ? 'Jährlich' : 'Monatlich'})</span>
              <span className="font-medium">{totals.aboTotal.toFixed(2)}€{isYearlyBilling ? '/Jahr' : '/Monat'}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between py-2 text-green-600 bg-green-50 px-3 rounded-md">
                <span>Rabatt</span><span className="font-medium">-{totals.totalDiscount.toFixed(2)}€</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 text-lg font-bold">
              <span>Erste Zahlung</span>
              <span className={totals.totalDiscount > 0 ? "text-green-600" : ""}>{totals.firstPayment.toFixed(2)}€</span>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full text-lg py-6" disabled={loading}>
          {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Wird erstellt...</> : "Zur Kasse (Stripe Checkout)"}
        </Button>
      </form>
    </div>
  );
}
