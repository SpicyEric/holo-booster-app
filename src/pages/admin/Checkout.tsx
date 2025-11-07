import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Minus, Info, Check, CheckCircle2, XCircle } from "lucide-react";

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Customer Data
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState({
    street: "",
    city: "",
    postalCode: "",
    country: "Deutschland",
  });

  // Add-ons
  const [extraDisplays, setExtraDisplays] = useState(0);
  const [customDesign, setCustomDesign] = useState(false);

  // Promo Code
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeValidations, setPromoCodeValidations] = useState<Array<{
    code: string;
    valid: boolean;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    appliesTo?: 'one_time' | 'recurring' | 'both';
    error?: string;
  }>>([]);
  const [validatingPromoCode, setValidatingPromoCode] = useState(false);
  
  // Legal
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Price calculation
  const MONTHLY_BASE = 39.45;
  const SETUP_FEE = 149.00;
  const EXTRA_DISPLAY = 6.00;
  const CUSTOM_DESIGN = 30.00;

  const calculateDiscount = (baseAmount: number, appliesTo: string) => {
    let totalDiscount = 0;
    
    for (const validation of promoCodeValidations) {
      if (!validation.valid) continue;
      if (validation.appliesTo !== appliesTo && validation.appliesTo !== 'both') continue;
      
      if (validation.discountType === 'percentage') {
        totalDiscount += baseAmount * (validation.discountValue! / 100);
      } else {
        totalDiscount += validation.discountValue!;
      }
    }
    
    return totalDiscount;
  };

  const baseOneTimeCosts = SETUP_FEE + (extraDisplays * EXTRA_DISPLAY) + (customDesign ? CUSTOM_DESIGN : 0);
  const baseMonthlyCosts = MONTHLY_BASE;
  
  const oneTimeDiscount = calculateDiscount(baseOneTimeCosts, 'one_time');
  const monthlyDiscount = calculateDiscount(baseMonthlyCosts, 'recurring');
  
  const oneTimeCosts = baseOneTimeCosts - oneTimeDiscount;
  const monthlyCosts = baseMonthlyCosts - monthlyDiscount;

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeValidations([]);
      return;
    }
    
    setValidatingPromoCode(true);
    const codes = promoCode.split(',').map(c => c.trim().toUpperCase()).filter(c => c.length > 0);
    const validations: typeof promoCodeValidations = [];
    
    try {
      for (const code of codes) {
        try {
          const { data, error } = await supabase.functions.invoke('validate-promo-code', {
            body: { code }
          });
          
          if (error) throw error;
          
          validations.push({
            code,
            ...data
          });
          
          if (data.valid) {
            toast.success(`Rabattcode "${code}" gültig`);
          } else {
            toast.error(`"${code}": ${data.error || 'Ungültig'}`);
          }
        } catch (error: any) {
          validations.push({
            code,
            valid: false,
            error: error.message
          });
          toast.error(`"${code}": Fehler bei Validierung`);
        }
      }
      
      setPromoCodeValidations(validations);
    } finally {
      setValidatingPromoCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !customerEmail) {
      toast.error("Bitte Name und E-Mail eingeben");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Bitte AGB akzeptieren");
      return;
    }

    try {
      setLoading(true);

      const validCodes = promoCodeValidations
        .filter(v => v.valid)
        .map(v => v.code);

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          customerName,
          customerEmail,
          companyName,
          address,
          extraDisplays,
          customDesign,
          promoCodes: validCodes.length > 0 ? validCodes : undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Checkout-Session erstellt - Kunde wird nach Zahlung automatisch angelegt");
        navigate("/admin/customers");
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      toast.error(error.message || "Fehler beim Erstellen der Checkout-Session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Kunde abschließen</h1>
            <p className="text-muted-foreground">
              Kundendaten erfassen und Stripe Checkout initiieren
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Data */}
                <Card>
                  <CardHeader>
                    <CardTitle>Kundendaten</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Name *</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required
                          placeholder="Max Mustermann"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerEmail">E-Mail *</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required
                          placeholder="max@beispiel.de"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Firmenname (optional)</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Beispiel GmbH"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="street">Straße</Label>
                        <Input
                          id="street"
                          value={address.street}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                          placeholder="Musterstraße 123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Stadt</Label>
                        <Input
                          id="city"
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          placeholder="Berlin"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">PLZ</Label>
                        <Input
                          id="postalCode"
                          value={address.postalCode}
                          onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                          placeholder="10115"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Land</Label>
                        <Input
                          id="country"
                          value={address.country}
                          onChange={(e) => setAddress({ ...address, country: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add-ons */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add-ons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">Extra Aufsteller</p>
                        <p className="text-sm text-muted-foreground">6,00 € pro Stück (einmalig)</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExtraDisplays(Math.max(0, extraDisplays - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold">{extraDisplays}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExtraDisplays(extraDisplays + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">Individuelles Design</p>
                        <p className="text-sm text-muted-foreground">30,00 € (einmalig)</p>
                      </div>
                      <Checkbox
                        checked={customDesign}
                        onCheckedChange={(checked) => setCustomDesign(checked as boolean)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Promo Code */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rabattcode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="promoCode">Code (optional)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="promoCode"
                            value={promoCode}
                            onChange={(e) => {
                              setPromoCode(e.target.value.toUpperCase());
                              setPromoCodeValidations([]);
                            }}
                            placeholder="CODE1, CODE2 (max. 2)"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={validatePromoCode}
                            disabled={validatingPromoCode || !promoCode.trim()}
                            className="px-3"
                          >
                            {validatingPromoCode ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {promoCodeValidations.length > 0 && (
                        <div className="space-y-2">
                          {promoCodeValidations.map((validation, index) => (
                            <div key={index} className={`text-sm flex items-center gap-2 ${
                              validation.valid ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {validation.valid ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  {validation.code}: Gültig
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4" />
                                  {validation.code}: {validation.error}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Price Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle>Preisübersicht</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* One-time costs */}
                    <div>
                      <h3 className="font-semibold mb-3">Einmalige Kosten</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Setup-Gebühr</span>
                          <span className="font-medium">{SETUP_FEE.toFixed(2)} €</span>
                        </div>
                        {extraDisplays > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Extra Aufsteller ({extraDisplays}x)
                            </span>
                            <span className="font-medium">
                              {(extraDisplays * EXTRA_DISPLAY).toFixed(2)} €
                            </span>
                          </div>
                        )}
                        {customDesign && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Individuelles Design</span>
                            <span className="font-medium">{CUSTOM_DESIGN.toFixed(2)} €</span>
                          </div>
                        )}
                        
                        {oneTimeDiscount > 0 && (
                          <>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Zwischensumme</span>
                              <span className="font-medium">{baseOneTimeCosts.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>Rabatt ({promoCodeValidations.filter(v => v.valid).map(v => v.code).join(', ')})</span>
                              <span>-{oneTimeDiscount.toFixed(2)} €</span>
                            </div>
                          </>
                        )}
                        
                        <Separator />
                        <div className="flex justify-between font-bold text-base">
                          <span>Gesamt einmalig</span>
                          <span className={oneTimeDiscount > 0 ? "text-green-600" : ""}>
                            {oneTimeCosts.toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Monthly costs */}
                    <div>
                      <h3 className="font-semibold mb-3">Monatliche Kosten</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">QRait Basis-Abo</span>
                          <span className="font-medium">{MONTHLY_BASE.toFixed(2)} €</span>
                        </div>
                        
                        {monthlyDiscount > 0 && (
                          <>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Zwischensumme</span>
                              <span className="font-medium">{baseMonthlyCosts.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>Rabatt ({promoCodeValidations.filter(v => v.valid).map(v => v.code).join(', ')})</span>
                              <span>-{monthlyDiscount.toFixed(2)} €</span>
                            </div>
                          </>
                        )}
                        
                        <Separator />
                        <div className="flex justify-between font-bold text-base">
                          <span>Monatlich fällig</span>
                          <span className={monthlyDiscount > 0 ? "text-green-600" : ""}>
                            {monthlyCosts.toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Legal info */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                        <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>• 14 Tage Widerrufsrecht</p>
                          <p>• Monatlich kündbar</p>
                          <p>• Zahlungsdaten werden sicher bei Stripe erfasst</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="terms"
                          checked={acceptedTerms}
                          onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                          className="mt-1"
                        />
                        <Label htmlFor="terms" className="text-xs leading-relaxed cursor-pointer">
                          Ich akzeptiere die AGB und Datenschutzbestimmungen. Der Kunde wird nach erfolgreicher Zahlung automatisch angelegt und erhält eine Welcome-E-Mail mit Dashboard-Zugang.
                        </Label>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <Button
                        type="submit"
                        disabled={loading || !acceptedTerms}
                        className="w-full"
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Erstelle Session...
                          </>
                        ) : (
                          "Zahlung starten"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/admin/customers")}
                        className="w-full"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
