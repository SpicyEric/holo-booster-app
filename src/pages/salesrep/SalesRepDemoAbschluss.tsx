import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Loader2, CheckCircle2, Info } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import CheckoutForm, { type CheckoutPrefill } from "@/components/checkout/CheckoutForm";
import {
  enableDemoMerchant,
} from "@/lib/demoMerchant";
import {
  DEMO_ONBOARDING_CUSTOMER_ID,
  DEMO_ONBOARDING_MERCHANT_NAME,
  startDemoOnboardingTour,
} from "@/lib/demoOnboardingTour";

const DEMO_PREFILL: CheckoutPrefill = {
  companyName: DEMO_ONBOARDING_MERCHANT_NAME,
  street: "Keupstraße",
  houseNumber: "18",
  postalCode: "51063",
  city: "Köln",
  country: "Deutschland",
  vatId: "DE987654321",
  industry: "barbershop",
  firstName: "Emre",
  lastName: "Yılmaz",
  contactEmail: "demo+barbershop-emre@eloyo.de",
  contactPhone: "+49 221 45678912",
  additionalContacts: "",
};

type Phase = "form" | "checkout" | "success";

export default function SalesRepDemoAbschluss() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("form");
  const submittedValuesRef = useRef<Record<string, string> | null>(null);

  // Highlight + pulse the "Zur Kasse" submit button at the bottom of CheckoutForm.
  useEffect(() => {
    const root = document.getElementById("demo-abschluss-root");
    if (!root) return;
    const btn = root.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (!btn) return;
    btn.textContent = "Kunde abschließen (Demo)";
    btn.classList.add(
      "ring-4",
      "ring-amber-300",
      "ring-offset-2",
      "animate-pulse",
      "shadow-lg",
      "shadow-amber-500/40"
    );
    return () => {
      btn.classList.remove(
        "ring-4",
        "ring-amber-300",
        "ring-offset-2",
        "animate-pulse",
        "shadow-lg",
        "shadow-amber-500/40"
      );
    };
  }, []);

  const handleDemoSubmit = (values: Parameters<NonNullable<React.ComponentProps<typeof CheckoutForm>["onDemoSubmit"]>>[0]) => {
    submittedValuesRef.current = values;
    setPhase("checkout");
    setTimeout(() => setPhase("success"), 1700);
  };

  const handleStartSetup = () => {
    const v = submittedValuesRef.current || {};
    const displayName = (v as any).companyName?.trim() || DEMO_ONBOARDING_MERCHANT_NAME;
    enableDemoMerchant({
      returnPath: "/vertriebler/demo-abschluss",
      customerId: DEMO_ONBOARDING_CUSTOMER_ID,
      name: displayName,
    });
    // Initial-Profil aus dem Checkout-Formular in den Demo-Onboarding-State übernehmen,
    // damit Profil/Punktesystem/Marketing direkt die eingetragenen Werte zeigen.
    startDemoOnboardingTour({
      name: displayName,
      company_name: displayName,
      industry: (v as any).industry || "barbershop",
      street: (v as any).street || "",
      house_number: (v as any).houseNumber || "",
      postal_code: (v as any).postalCode || "",
      city: (v as any).city || "",
      phone: (v as any).contactPhone || "",
      email: (v as any).contactEmail || "demo+barbershop-emre@eloyo.de",
      contact_person: [(v as any).firstName, (v as any).lastName].filter(Boolean).join(" "),
    });
    navigate("/kunde/willkommen", { replace: true });
  };

  return (
    <div id="demo-abschluss-root" className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-amber-500" /> Demo Abschluss
        </h1>
        <p className="text-muted-foreground mt-1">
          Übe einen kompletten Kundenabschluss inkl. Einrichtung – ohne dass
          etwas gespeichert oder bezahlt wird.
        </p>
      </div>

      {/* Demo banner */}
      <div className="rounded-xl border-2 border-amber-300/60 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4 text-amber-700" />
        </div>
        <div className="text-sm text-amber-900">
          <p className="font-bold mb-0.5">
            Trainings-Modus – nichts wird gespeichert
          </p>
          <p>
            Alle Felder sind mit dem Beispielkunden „
            {DEMO_PREFILL.companyName}" vorausgefüllt. Du kannst sie verändern,
            aber es wird kein Kunde angelegt und keine Zahlung ausgelöst.
          </p>
        </div>
      </div>

      <CheckoutForm
        backPath="/vertriebler"
        backLabel="Zurück"
        prefill={DEMO_PREFILL}
        demoMode
        onDemoSubmit={handleDemoSubmit}
      />

      {/* Stripe simulation */}
      <Dialog open={phase === "checkout"} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm text-center py-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div>
              <p className="font-bold text-lg">Stripe-Checkout startet…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Im echten Abschluss wird hier die Zahlung ausgelöst. (Demo –
                keine Zahlung)
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
                Top! Jetzt geht's an die Einrichtung. Du wirst gleich Schritt
                für Schritt durch das Dashboard von „{DEMO_PREFILL.companyName}"
                geführt.
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
