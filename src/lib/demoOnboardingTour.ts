/**
 * Geführte Demo-Abschluss-Tour für Vertriebler.
 */
const STEP_KEY = "eloyo:demo-onboarding-tour";
const STATE_KEY = "eloyo:demo-onboarding-state";
const EVENT_NAME = "eloyo:demo-onboarding-tour-changed";

export const DEMO_ONBOARDING_CUSTOMER_ID = "00000000-0000-4000-8000-000000000421";
export const DEMO_ONBOARDING_MERCHANT_NAME = "Barbershop Emre";
export const DEMO_ONBOARDING_CARD_ID = "EMRE1-0421A-00001";

export interface TourStep {
  title: string;
  body: string;
  highlight?: string;
}

export interface DemoOnboardingState {
  profile: Record<string, any>;
  boxes: Array<{ id: string; box_id: string; stamp_code: string; assigned_at: string }>;
  chips: Array<{ id: string; chip_uid: string; stamp_name: string | null; stamp_color: string | null; points_value: number | null; is_active: boolean | null }>;
  rewards: Array<{ id: string; title: string; description: string | null; points_required: number; image_url: string | null; is_active: boolean | null }>;
  newCustomerOffer: { id: string; title: string; description: string | null; bonus_stamps: number | null; is_active: boolean | null; image_url: string | null } | null;
}

const createInitialDemoOnboardingState = (): DemoOnboardingState => ({
  profile: {
    id: DEMO_ONBOARDING_CUSTOMER_ID,
    name: DEMO_ONBOARDING_MERCHANT_NAME,
    company_name: DEMO_ONBOARDING_MERCHANT_NAME,
    email: "demo+barbershop-emre@eloyo.de",
    status: "active",
    customer_number: 421,
    created_at: new Date().toISOString(),
    industry: "barbershop",
    street: "Keupstraße",
    house_number: "18",
    postal_code: "51063",
    city: "Köln",
    description: "",
    logo_url: "",
    cover_image_url: "",
    phone: "",
    website: "",
    instagram: "",
    facebook: "",
    twitter: "",
    opening_hours: {},
    gallery_images: [],
    stamp_mode: "revenue",
    avg_revenue: 25,
    manual_stamp_mode: false,
    referral_enabled: true,
    referral_inviter_points: 0,
    referral_invitee_points: 0,
    birthday_enabled: false,
  },
  boxes: [],
  chips: [],
  rewards: [],
  newCustomerOffer: null,
});

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Schritt 1 – Karten-ID eintragen",
    body: "Öffne links 'Mein Geschäft' → 'System' und trage diese Demo-Karten-ID ein:",
    highlight: DEMO_ONBOARDING_CARD_ID,
  },
  {
    title: "Schritt 2 – Punktwerte einstellen",
    body: "Lass das automatische Karten-System aktiv und stelle den durchschnittlichen Warenkorb passend ein. Danach speicherst du die Karte.",
  },
  {
    title: "Schritt 3 – Prämien festlegen",
    body: "Wechsle zu Marketing → Prämien und lege mindestens eine Prämie an, die Emres Kunden wirklich wollen.",
  },
  {
    title: "Schritt 4 – Neukundenprämie & Empfehlungs-Bonus",
    body: "Richte anschließend Neukundenangebot und Empfehlungs-Bonus ein, damit direkt Wachstum entsteht.",
  },
  {
    title: "Schritt 5 – Profil finalisieren",
    body: "Zurück in 'Mein Geschäft' ergänzt du Beschreibung, Bilder, Kontakt und Öffnungszeiten – erst jetzt wird das Profil sichtbar komplett.",
  },
  {
    title: "Perfekt – Einrichtung abgeschlossen!",
    body: "Dein Demo-Kunde ist optimal eingerichtet. Mache jetzt direkt 1–2 Trainingsdurchläufe mit deinem Kunden vor Ort: QR scannen → Karte ans Handy halten → Prämie freischalten.",
  },
];

export function startDemoOnboardingTour() {
  try {
    localStorage.setItem(STEP_KEY, "0");
    localStorage.setItem(STATE_KEY, JSON.stringify(createInitialDemoOnboardingState()));
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

export function isDemoOnboardingTourActive(): boolean {
  return getDemoOnboardingStep() !== null;
}

export function getDemoOnboardingState(): DemoOnboardingState {
  if (typeof window === "undefined") return createInitialDemoOnboardingState();
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return createInitialDemoOnboardingState();
    const parsed = JSON.parse(raw) as DemoOnboardingState;
    return {
      ...createInitialDemoOnboardingState(),
      ...parsed,
      profile: { ...createInitialDemoOnboardingState().profile, ...(parsed.profile || {}) },
      boxes: parsed.boxes || [],
      chips: parsed.chips || [],
      rewards: parsed.rewards || [],
      newCustomerOffer: parsed.newCustomerOffer || null,
    };
  } catch {
    return createInitialDemoOnboardingState();
  }
}

export function updateDemoOnboardingState(updates: Partial<DemoOnboardingState>) {
  try {
    const current = getDemoOnboardingState();
    localStorage.setItem(STATE_KEY, JSON.stringify({
      ...current,
      ...updates,
      profile: updates.profile ? { ...current.profile, ...updates.profile } : current.profile,
    }));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {}
}

export function endDemoOnboardingTour() {
  try {
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem(STATE_KEY);
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
