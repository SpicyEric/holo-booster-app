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
    body: "Öffne links 'Mein Geschäft' → Tab 'System' und trage diese Demo-Karten-ID ein. (Im echten Abschluss findest du die ID auf der Rückseite der NFC-Karte des Kunden.)",
    highlight: DEMO_ONBOARDING_CARD_ID,
  },
  {
    title: "Schritt 2 – Durchschnittlichen Warenkorb einstellen",
    body: "Lass das automatische Karten-System aktiv. Frag den Kunden: „Was gibt ein Durchschnittskunde bei dir aus?\"\n\n→ Emre sagt dir: ca. 20 €.\n\nStelle den Regler also auf 20 € und klicke auf 'Karte speichern'. Damit weiß das System automatisch, wie viele Punkte pro Besuch vergeben werden.",
  },
  {
    title: "Schritt 3 – Auf manuelles Karten-System wechseln",
    body: "Wechsle jetzt oben auf 'Manuelles Karten-System'. Stelle bei Karte 2 (mittlerer Wert) manuell 20 Punkte ein und klicke wieder auf 'Karte speichern'.\n\nWarum? Werte wie 10 / 20 / 50 Punkte sind runder, leichter zu merken und wirken für den Kunden klarer als krumme Zahlen.",
  },
  {
    title: "Schritt 4 – Erste Prämie anlegen",
    body: "Wechsle zu 'Marketing' → 'Prämien' und klicke auf 'Neue Prämie'.\n\nFrag Emre: „Was ist ein kleines Geschenk, das du nach 4–5 Besuchen rausgeben würdest?\" – Beispiel Barbershop: 5 € Rabatt auf den Haarschnitt.\n\nTrage ein:\n• Titel: 5 € Rabatt auf deinen Haarschnitt\n• Beschreibung: auf deinen nächsten Haarschnitt\n• Benötigte Punkte: 80\n\nWarum 80 Punkte? Ein Durchschnittskunde gibt 20 € aus = 20 Punkte pro Besuch. Nach 4 Besuchen hat er 80 Punkte und schaltet die Prämie frei. Klicke dann auf 'Prämie erstellen'.",
  },
  {
    title: "Schritt 5 – Vier weitere Prämien anlegen",
    body: "Wichtig: Lass den Kunden NIE mit nur einer Prämie zurück! Mehrere Prämien sind das Fundament – sie halten Kunden langfristig motiviert. Denke gemeinsam mit Emre nach, gib ihm Beispiele, unterstütze ihn.\n\nLege jetzt diese 4 weiteren Prämien an:\n\n• Haargel zum halben Preis – 100 Punkte (≈ 5 Besuche)\n• Bartpflege / Bartrasur kostenlos – 130 Punkte (≈ 6–7 Besuche)\n• Gratis Haarschnitt – 180 Punkte (≈ 9 Besuche)\n• Haarschnitt + Bart kostenlos – 230 Punkte (≈ 11–12 Besuche)\n\nSo entsteht eine echte Treue-Treppe – immer ein nächstes Ziel in Sicht.",
  },
  {
    title: "Schritt 6 – Empfehlungs-Bonus aktivieren",
    body: "Gehe zu 'Marketing' → 'Empfehlungs-Bonus'. Stelle 80 Punkte pro Empfehlung ein.\n\nWarum genau 80? Bereits 2 Empfehlungen = 160 Punkte → das reicht fast für einen gratis Haarschnitt. Das motiviert Kunden EXTREM, Freunde mitzubringen oder Empfehlungen rauszuschicken.\n\nSpeichere die Einstellung.",
  },
  {
    title: "Schritt 7 – Neukundenprämie anlegen",
    body: "Bevor du sie anlegst, erkläre Emre kurz das Prinzip:\n\n„Wenn ich einen Kunden frage 'Möchtest du Punkte sammeln?' sagt er meist 'Nee, brauch ich nicht.' Wenn ich aber sage 'Hast du schon eine Kundenkarte? Nein? Dann gebe ich dir direkt 20 % Rabatt, wenn wir dich kurz mit reinnehmen' – dann ist der Widerstand weg und der Kunde sagt: Let's go.\"\n\nGehe zu 'Marketing' → 'Neukundenprämie' → 'Erstellen' und trage ein:\n• Titel: 20 % Sofortrabatt\n• Beschreibung: Herzlich willkommen im Barbershop! Als kleines Dankeschön, dass du Teil unseres Punktesystems wirst, bekommst du sofort 20 % Rabatt auf deinen heutigen Besuch.\n\nKlicke dann auf 'Erstellen'.",
  },
  {
    title: "Schritt 8 – Geburtstagsgrüße aktivieren",
    body: "Gehe zu 'Marketing' → 'Automationen'. Schalte die Geburtstagsgrüße EIN und stelle bei Bonuspunkten 20 ein. Speichern nicht vergessen.\n\nKurz dem Kunden erklären (nicht zu lang!):\n\n„Ich schalt dir die Geburtstagsgrüße an. So bekommt jeder deiner Kunden automatisch an seinem Geburtstag eine persönliche Push-Nachricht von dir – plus 20 Punkte direkt in der App. Das animiert sie, wieder vorbeizukommen.\"",
  },
  {
    title: "Schritt 9 – Google-Bewertungs-Bonus einrichten",
    body: "Gehe zu 'Google-Bewertungen'. Schalte den Bewertungs-Bonus EIN und stelle den Regler auf 10 Punkte.\n\nDann fügst du den Google-Bewertungslink ein – kopiere dazu diesen Demo-Link:\n\n💡 Falls du beim echten Kunden den Bewertungslink nicht findest: In der Seite ist ein kurzer Slider, der dir Schritt für Schritt zeigt, wo du den Link bei Google holst.\n\nKlicke auf 'Einstellungen speichern'.",
    highlight: "https://g.page/r/CdEMO-BARBERSHOP-EMRE/review",
  },
  {
    title: "Schritt 10 – Titelbild hochladen",
    body: "Gehe zurück zu 'Mein Geschäft' → Tab 'Profil' und lade mindestens EIN Titelbild hoch. Erst damit funktioniert die schöne Drehanimation in der App und das Profil fühlt sich richtig an.\n\nTipp für den echten Kunden: Lass dir das Bild einfach per WhatsApp schicken – das geht in 30 Sekunden und du kannst direkt loslegen.",
  },
  {
    title: "Perfekt – Einrichtung abgeschlossen!",
    body: "Top gemacht! Jetzt kommt der wichtigste Teil: Spiele alles mit dem Kunden vor Ort durch.\n\n• 1–2 Übungs-Scans: QR scannen → Karte ans Handy halten → Punkte sehen\n• Mindestens einmal eine Prämie gemeinsam einlösen\n\nDanach polierst du in Ruhe Beschreibung, Öffnungszeiten und weitere Bilder. Fertig – sauber abgeschlossen.",
  },
];

export function startDemoOnboardingTour(profileOverride?: Record<string, any>) {
  try {
    const initial = createInitialDemoOnboardingState();
    if (profileOverride) {
      initial.profile = { ...initial.profile, ...profileOverride };
    }
    localStorage.setItem(STEP_KEY, "0");
    localStorage.setItem(STATE_KEY, JSON.stringify(initial));
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
