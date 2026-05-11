import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, ShoppingCart, Loader2, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { enableDemoMerchant, DEFAULT_DEMO_MERCHANT_CUSTOMER_ID, DEFAULT_DEMO_MERCHANT_NAME } from "@/lib/demoMerchant";
import { startDemoOnboardingTour } from "@/lib/demoOnboardingTour";

const DEMO_DATA = {
  company_name: "Backstube König",
  contact_first_name: "Markus",
  contact_last_name: "König",
  email: "demo+backstube@eloyo.de",
  phone: "+49 89 123456789",
  street: "Marienplatz 8",
  zip: "80331",
  city: "München",
  country: "Deutschland",
  vat_id: "DE123456789",
  notes: "Backstube mit 1 Standort, traditionelle Bäckerei seit 1972. Will Stammkunden binden und Neukunden über die App gewinnen.",
};

type Phase = "form" | "checkout" | "success";

export default function SalesRepDemoAbschluss() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("form");

  const handleAbschluss = () => {
    setPhase("checkout");
    setTimeout(() => setPhase("success"), 1700);
  };

  const handleStartSetup = () => {
    enableDemoMerchant({
      returnPath: "/vertriebler",
      customerId: DEFAULT_DEMO_MERCHANT_CUSTOMER_ID,
      name: DEFAULT_DEMO_MERCHANT_NAME,
    });
    startDemoOnboardingTour();
    navigate("/kunde", { replace: true });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate("/vertriebler")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Zurück
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500" /> Demo Abschluss
          </h1>
          <p className="text-muted-foreground mt-1">
            Übe einen kompletten Kundenabschluss inkl. Einrichtung – ohne dass etwas gespeichert oder bezahlt wird.
          </p>
        </div>
      </div>

      {/* Demo banner */}
      <div className="rounded-xl border-2 border-amber-300/60 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4 text-amber-700" />
        </div>
        <div className="text-sm text-amber-900">
          <p className="font-bold mb-0.5">Trainings-Modus – nichts wird gespeichert</p>
          <p>
            Alle Felder sind mit dem Beispielkunden „{DEMO_DATA.company_name}" vorausgefüllt. Du kannst sie verändern, aber es wird kein Kunde angelegt und keine Zahlung ausgelöst.
          </p>
        </div>
      </div>

      {/* Form (always shown, locked while in checkout/success) */}
      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold mb-1">Kundendaten</h2>
          <p className="text-sm text-muted-foreground">Im echten Abschluss füllst du diese Felder mit deinem Kunden gemeinsam aus.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Firma" defaultValue={DEMO_DATA.company_name} />
          <Field label="USt-IdNr." defaultValue={DEMO_DATA.vat_id} />
          <Field label="Vorname Inhaber" defaultValue={DEMO_DATA.contact_first_name} />
          <Field label="Nachname Inhaber" defaultValue={DEMO_DATA.contact_last_name} />
          <Field label="E-Mail" defaultValue={DEMO_DATA.email} type="email" />
          <Field label="Telefon" defaultValue={DEMO_DATA.phone} type="tel" />
          <Field label="Straße & Hausnummer" defaultValue={DEMO_DATA.street} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="PLZ" defaultValue={DEMO_DATA.zip} />
            <div className="col-span-2">
              <Field label="Stadt" defaultValue={DEMO_DATA.city} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notizen für den Termin</Label>
          <Textarea defaultValue={DEMO_DATA.notes} rows={3} />
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Starterbox + 1 Standort</p>
            <p className="text-xs text-muted-foreground">Einmalig 49 € · 39 €/Monat (Demo-Werte)</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Heute fällig</p>
            <p className="text-lg font-bold">49,00 €</p>
          </div>
        </div>
      </Card>

      {/* Animated CTA */}
      <div className="relative">
        <div className="absolute -top-7 right-4 hidden md:flex items-center gap-1 text-amber-700 text-xs font-semibold animate-bounce">
          <span>Hier geht's weiter</span>
          <ArrowRight className="w-3.5 h-3.5 rotate-90" />
        </div>
        <button
          onClick={handleAbschluss}
          disabled={phase !== "form"}
          className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-amber-950 font-bold text-base px-6 py-4 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="absolute inset-0 bg-white/20 animate-pulse" />
          <ShoppingCart className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Kunde abschließen (Demo)</span>
          <ArrowRight className="w-5 h-5 relative z-10" />
        </button>
      </div>

      {/* Stripe simulation */}
      <Dialog open={phase === "checkout"} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm text-center py-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div>
              <p className="font-bold text-lg">Stripe-Checkout startet…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Im echten Abschluss wird hier die Zahlung ausgelöst. (Demo – keine Zahlung)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success → start guided setup */}
      <Dialog open={phase === "success"} onOpenChange={() => {}}>
        <DialogContent className="max-w-md text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-xl">Zahlung erfolgreich (Demo)</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Top! Jetzt geht's an die Einrichtung. Du wirst gleich Schritt für Schritt durch das Dashboard von „{DEMO_DATA.company_name}" geführt.
              </p>
            </div>
            <button
              onClick={handleStartSetup}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500 text-amber-950 font-semibold hover:bg-amber-400 transition-colors active:scale-[0.98]"
            >
              Einrichtung starten <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPhase("form")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Abbrechen
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input defaultValue={defaultValue} type={type} />
    </div>
  );
}
