import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, Globe, CreditCard, Loader2, Wrench } from "lucide-react";
import { INDUSTRIES } from "@/pages/wizard/wizardLogic";

const PRICING = {
  setup: 559,
  monthly: 39,
};

export default function WebsiteCheckout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Company profile
  const [companyName, setCompanyName] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Deutschland");
  const [vatId, setVatId] = useState("");
  const [industry, setIndustry] = useState("");

  // Contact person
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Billing
  const [billingMatchesCompany, setBillingMatchesCompany] = useState(true);
  const [billingName, setBillingName] = useState("");
  const [billingStreet, setBillingStreet] = useState("");
  const [billingHouseNumber, setBillingHouseNumber] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountry, setBillingCountry] = useState("Deutschland");
  const [billingEmail, setBillingEmail] = useState("");

  // Additional contacts
  const [additionalContacts, setAdditionalContacts] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactEmail || !firstName || !lastName) {
      toast.error("Bitte fülle alle Pflichtfelder aus");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) {
      toast.error("Ungültige E-Mail-Adresse");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { toast.error("Nicht eingeloggt"); navigate("/auth"); return; }

      const billingAddress = billingMatchesCompany
        ? { name: companyName, street, houseNumber, city, postalCode, country }
        : { name: billingName, street: billingStreet, houseNumber: billingHouseNumber, city: billingCity, postalCode: billingPostalCode, country: billingCountry, email: billingEmail };

      const { data, error } = await supabase.functions.invoke("create-website-checkout-session", {
        body: {
          customerName: `${firstName} ${lastName}`,
          customerEmail: contactEmail,
          companyName,
          address: { street, houseNumber, city, postalCode, country },
          billingAddress,
          industry,
          vatId,
          contactPhone,
          additionalContacts,
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

  const total = PRICING.setup + PRICING.monthly;

  return (
    <div className="min-h-screen p-4 md:p-8 font-body">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          ← Zurück zum Dashboard
        </Button>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Eloyo Website Service</h1>
          <p className="text-muted-foreground">Einmalige Erstellung & monatlicher Service für die Website deines Kunden</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
          {/* Products overview */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Erstellung & Einrichtung</CardTitle>
                    <CardDescription className="text-xs">Einmaliger Setup-Preis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold">{PRICING.setup.toFixed(2)}€</span>
                  <span className="text-xs text-muted-foreground">einmalig (brutto)</span>
                </div>
                <ul className="space-y-1">
                  {[
                    "In 48 Stunden live",
                    "Komplette Website-Erstellung",
                    "Individuelles Design",
                    "Einrichtung & Konfiguration",
                    "Onboarding",
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" />{f}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Monatlicher Service</CardTitle>
                    <CardDescription className="text-xs">Hosting, Pflege & Support</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold">{PRICING.monthly.toFixed(2)}€</span>
                  <span className="text-xs text-muted-foreground">/Monat (brutto)</span>
                </div>
                <ul className="space-y-1">
                  {[
                    "1× kostenlose Änderungen pro Monat",
                    "Hosting-Gebühren inklusive",
                    "Kundenservice & Support",
                    "Technische Wartung",
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" />{f}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Company Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Firmenprofil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firmenname *</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Musterfirma GmbH" required />
                </div>
                <div className="space-y-2">
                  <Label>Branche *</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue placeholder="Branche wählen..." /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Straße</Label>
                  <Input value={street} onChange={e => setStreet(e.target.value)} placeholder="Musterstraße" />
                </div>
                <div className="space-y-2">
                  <Label>Hausnummer</Label>
                  <Input value={houseNumber} onChange={e => setHouseNumber(e.target.value)} placeholder="123" />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>PLZ</Label>
                  <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="12345" />
                </div>
                <div className="space-y-2">
                  <Label>Stadt</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Musterstadt" />
                </div>
                <div className="space-y-2">
                  <Label>Land</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Umsatzsteuer-ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={vatId} onChange={e => setVatId(e.target.value)} placeholder="DE123456789" />
              </div>
            </CardContent>
          </Card>

          {/* Contact Person */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kontaktperson</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vorname *</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Max" required />
                </div>
                <div className="space-y-2">
                  <Label>Nachname *</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Mustermann" required />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-Mail (geschäftlich) *</Label>
                  <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="max@firma.de" required />
                </div>
                <div className="space-y-2">
                  <Label>Telefon <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+49 171 ..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Abrechnungsdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox id="billing-same" checked={billingMatchesCompany} onCheckedChange={(v) => setBillingMatchesCompany(!!v)} />
                <Label htmlFor="billing-same" className="text-sm cursor-pointer">Rechnungsadresse ist gleich Firmenadresse</Label>
              </div>
              {!billingMatchesCompany && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Name / Firma</Label>
                    <Input value={billingName} onChange={e => setBillingName(e.target.value)} placeholder="Rechnungsempfänger" />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Straße</Label>
                      <Input value={billingStreet} onChange={e => setBillingStreet(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Hausnummer</Label>
                      <Input value={billingHouseNumber} onChange={e => setBillingHouseNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>PLZ</Label>
                      <Input value={billingPostalCode} onChange={e => setBillingPostalCode(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Stadt</Label>
                      <Input value={billingCity} onChange={e => setBillingCity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Land</Label>
                      <Input value={billingCountry} onChange={e => setBillingCountry(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail für Rechnung <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} placeholder="buchhaltung@firma.de" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zusätzliche Ansprechpartner <span className="text-muted-foreground text-xs font-normal">(optional)</span></CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={additionalContacts}
                onChange={e => setAdditionalContacts(e.target.value)}
                placeholder="z.B. Lisa Müller, Tel: +49 171 ..., E-Mail: lisa@firma.de"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-2 border-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-1.5 border-b text-sm">
                <span>Erstellung & Einrichtung (einmalig)</span>
                <span className="font-medium">{PRICING.setup.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between py-1.5 border-b text-sm">
                <span>Monatlicher Service</span>
                <span className="font-medium">{PRICING.monthly.toFixed(2)}€/Monat</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 font-bold">
                <span>Erste Zahlung</span>
                <span>{total.toFixed(2)}€</span>
              </div>
              <p className="text-xs text-muted-foreground">Danach {PRICING.monthly.toFixed(2)}€/Monat. Alle Preise brutto inkl. 19 % MwSt.</p>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full text-lg py-6" disabled={loading}>
            {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Wird erstellt...</> : "Zur Kasse (Stripe Checkout)"}
          </Button>
        </form>
      </div>
    </div>
  );
}
