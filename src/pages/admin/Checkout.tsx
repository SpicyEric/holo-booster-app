import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Customer Data
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [company, setCompany] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("DE");

  // Setup
  const [setupMode, setSetupMode] = useState<"price" | "dynamic">("price");
  const [setupVariant, setSetupVariant] = useState("qrate_setup_m");
  const [setupAmount, setSetupAmount] = useState("0");

  // Add-ons
  const [displayCount, setDisplayCount] = useState(0);
  const [includeDesign, setIncludeDesign] = useState(false);

  // Promo
  const [promoCode, setPromoCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !customerEmail || !addressLine1 || !postalCode || !city) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          customer: {
            name: customerName,
            email: customerEmail,
            company: company || undefined,
            address: {
              line1: addressLine1,
              line2: addressLine2 || undefined,
              postal_code: postalCode,
              city,
              country,
            },
          },
          setup: {
            mode: setupMode,
            priceLookup: setupMode === "price" ? setupVariant : undefined,
            amountCents: setupMode === "dynamic" ? Math.round(parseFloat(setupAmount) * 100) : undefined,
          },
          addons: {
            displayCount,
            design: includeDesign,
          },
          promoCode: promoCode || undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Checkout-Session erstellt - Bitte im neuen Tab abschließen");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Fehler beim Erstellen der Checkout-Session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Kunde abschließen</h1>
            <p className="text-muted-foreground">
              Neuen Kunden mit Abo, Setup-Gebühr und Add-ons anlegen
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kundendaten */}
            <Card>
              <CardHeader>
                <CardTitle>Kundendaten</CardTitle>
                <CardDescription>Kontaktinformationen des Kunden</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company">Firma (optional)</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="address1">Straße & Hausnummer *</Label>
                  <Input
                    id="address1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address2">Adresszusatz (optional)</Label>
                  <Input
                    id="address2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="postalCode">PLZ *</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ort *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Land *</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DE">Deutschland</SelectItem>
                        <SelectItem value="AT">Österreich</SelectItem>
                        <SelectItem value="CH">Schweiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Abo */}
            <Card>
              <CardHeader>
                <CardTitle>Abonnement</CardTitle>
                <CardDescription>Monatliches Basis-Abo (immer inklusive)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div>
                    <p className="font-semibold">QRait Basis-Abo</p>
                    <p className="text-sm text-muted-foreground">Monatlich kündbar</p>
                  </div>
                  <p className="text-xl font-bold">39,45 €</p>
                </div>
              </CardContent>
            </Card>

            {/* Setup */}
            <Card>
              <CardHeader>
                <CardTitle>Setup-Gebühr (verpflichtend)</CardTitle>
                <CardDescription>Einmalige Einrichtungsgebühr</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={setupMode === "price" ? "default" : "outline"}
                    onClick={() => setSetupMode("price")}
                  >
                    Standard Setup (149,00 €)
                  </Button>
                  <Button
                    type="button"
                    variant={setupMode === "dynamic" ? "default" : "outline"}
                    onClick={() => setSetupMode("dynamic")}
                  >
                    Individueller Betrag
                  </Button>
                </div>

                {setupMode === "price" ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div>
                      <p className="font-semibold">QRate Setup</p>
                      <p className="text-sm text-muted-foreground">Einmalige Einrichtung</p>
                    </div>
                    <p className="text-xl font-bold">149,00 €</p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="setupAmount">Setup-Betrag (€)</Label>
                    <Input
                      id="setupAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={setupAmount}
                      onChange={(e) => setSetupAmount(e.target.value)}
                      required
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add-ons */}
            <Card>
              <CardHeader>
                <CardTitle>Add-ons (optional)</CardTitle>
                <CardDescription>Zusätzliche einmalige Leistungen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="displayCount">Extra-Aufsteller (je 6,00 €)</Label>
                  <Input
                    id="displayCount"
                    type="number"
                    min="0"
                    value={displayCount}
                    onChange={(e) => setDisplayCount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="design"
                    checked={includeDesign}
                    onCheckedChange={(checked) => setIncludeDesign(checked as boolean)}
                  />
                  <Label htmlFor="design" className="cursor-pointer">
                    Individuelles Design (30,00 €)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Promo Code */}
            <Card>
              <CardHeader>
                <CardTitle>Rabattcode (optional)</CardTitle>
                <CardDescription>Gilt nur für Setup-Gebühr und Add-ons</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Promotion-Code eingeben"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Erstelle Checkout...
                  </>
                ) : (
                  "Zahlung & Abo starten"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate("/admin/customers")}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}