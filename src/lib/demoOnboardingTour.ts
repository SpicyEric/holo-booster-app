/**
 * Geführte "Demo-Abschluss"-Tour für Vertriebler.
 * Wird im Anschluss an den simulierten Stripe-Checkout gestartet
 * und führt durch die Einrichtung von Backstube König im Demo-Merchant-Modus.
 */
const STEP_KEY = "eloyo:demo-onboarding-tour";
const EVENT_NAME = "eloyo:demo-onboarding-tour-changed";

export interface TourStep {
  title: string;
  body: string;
  highlight?: string; // optionaler Hinweis (z. B. Karten-ID)
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Schritt 1 – Mein Geschäft öffnen",
    body: "Klicke links in der Sidebar auf „Mein Geschäft" und öffne dort den Tab „System".",
  },
  {
    title: "Schritt 2 – Karten-ID eintragen",
    body: "Suche im Bereich „Karten-System" das Feld für die Karten-ID und trage die folgende Demo-Karten-ID ein:",
    highlight: "DEMO-0421-AB",
  },
  {
    title: "Schritt 3 – Punktwerte einstellen",
    body: "Wechsle in den Tab „Punkte" und stelle die drei Werte ein: Klein 10, Mittel 30, Groß 60.",
  },
  {
    title: "Schritt 4 – Prämien festlegen",
    body: "Wechsle in den Tab „Prämien" und lege drei Stück fest: eine erste, eine mittlere und eine Top-Prämie.",
  },
  {
    title: "Schritt 5 – Neukundenprämie & Empfehlungs-Bonus",
    body: "Aktiviere die Neukundenprämie und setze die Punkte für eine Weiterempfehlung.",
  },
  {
    title: "Perfekt – Einrichtung abgeschlossen!",
    body: "Dein Demo-Kunde ist optimal eingerichtet. Mache jetzt direkt 1–2 Trainingsdurchläufe mit deinem Kunden vor Ort: QR scannen → Karte ans Handy halten → Prämie freischalten.",
  },
];

export function startDemoOnboardingTour() {
  try {
    localStorage.setItem(STEP_KEY, "0");
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {}
}

export function setDemoOnboardingStep(step: number) {
  try {
    localStorage.setItem(STEP_KEY, String(step));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {}
}

export function getDemoOnboardingStep(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STEP_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function endDemoOnboardingTour() {
  try {
    localStorage.removeItem(STEP_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {}
}

export function onDemoOnboardingTourChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}
