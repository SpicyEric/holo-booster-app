export interface WizardState {
  password: string;
  confirmPassword: string;
  boxId: string;
  businessName: string;
  industry: string;
  avgSpend: number;
  goals: string[];
  selectedVariant: "balanced" | "umsatzboost" | "simple";
  rewardName: string;
  rewardDescription: string;
  rewardImageUrl: string;
}

export const initialWizardState: WizardState = {
  password: "",
  confirmPassword: "",
  boxId: "",
  businessName: "",
  industry: "",
  avgSpend: 10,
  goals: [],
  selectedVariant: "balanced",
  rewardName: "",
  rewardDescription: "",
  rewardImageUrl: "",
};

export interface StampTier {
  label: string;
  threshold: number;
  points: number;
  color: string;
}

export interface StampSuggestion {
  type: "simple" | "tiered";
  pointsPerVisit?: number;
  tiers?: StampTier[];
}

const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export function calculateSuggestion(
  avgSpend: number,
  goals: string[],
  variant: "balanced" | "umsatzboost" | "simple"
): StampSuggestion {
  const isSimpleOnly =
    goals.length === 1 && goals.includes("simple");

  if (isSimpleOnly || variant === "simple") {
    return { type: "simple", pointsPerVisit: 5 };
  }

  if (variant === "balanced") {
    const small = roundTo5(avgSpend * 0.6);
    const medium = roundTo5(avgSpend * 1.2);
    const large = roundTo5(avgSpend * 2.5);
    return {
      type: "tiered",
      tiers: [
        { label: "Klein", threshold: small, points: small, color: "green" },
        { label: "Mittel", threshold: medium, points: medium, color: "blue" },
        { label: "Groß", threshold: large, points: large, color: "red" },
      ],
    };
  }

  // umsatzboost
  const small = roundTo5(avgSpend * 1.0);
  const medium = roundTo5(avgSpend * 2.0);
  const large = roundTo5(avgSpend * 3.0);
  return {
    type: "tiered",
    tiers: [
      { label: "Klein", threshold: small, points: small, color: "green" },
      { label: "Mittel", threshold: medium, points: medium, color: "blue" },
      { label: "Groß", threshold: large, points: large, color: "red" },
    ],
  };
}

export function suggestedRewardPoints(suggestion: StampSuggestion): number {
  if (suggestion.type === "simple") {
    return (suggestion.pointsPerVisit ?? 5) * 5;
  }
  const smallPoints = suggestion.tiers?.[0]?.points ?? 5;
  return smallPoints * 5;
}

export interface IndustryOption {
  value: string;
  label: string;
  icon: string; // lucide icon name mapped in component
}

export const INDUSTRIES: IndustryOption[] = [
  { value: "cafe", label: "Café", icon: "coffee" },
  { value: "baeckerei", label: "Bäckerei", icon: "cake" },
  { value: "restaurant", label: "Restaurant", icon: "utensils" },
  { value: "imbiss", label: "Imbiss", icon: "pizza" },
  { value: "friseur", label: "Friseur", icon: "scissors" },
  { value: "barbershop", label: "Barbershop", icon: "scissors" },
  { value: "kosmetikstudio", label: "Kosmetikstudio", icon: "sparkles" },
  { value: "shishabar", label: "Shishabar", icon: "flame" },
  { value: "einzelhandel", label: "Einzelhandel", icon: "shopping-bag" },
  { value: "apotheke", label: "Apotheke", icon: "pill" },
  { value: "tankstelle", label: "Tankstelle", icon: "fuel" },
  { value: "kiosk", label: "Kiosk", icon: "store" },
  { value: "fitnessstudio", label: "Fitnessstudio", icon: "dumbbell" },
  { value: "nagelstudio", label: "Nagelstudio", icon: "paintbrush" },
  { value: "eisdiele", label: "Eisdiele", icon: "icecream" },
  { value: "waschsalon", label: "Waschsalon", icon: "shirt" },
  { value: "sonstiges", label: "Sonstiges", icon: "more-horizontal" },
];

export const GOAL_OPTIONS = [
  {
    value: "visits",
    label: "Mehr Wiederbesuche",
    description: "Niedrige Einstiegsschwelle, häufiger kleine Belohnungen",
    icon: "repeat",
  },
  {
    value: "basket",
    label: "Höherer Warenkorb",
    description: "Stärkere Staffelung, große Stempel ab höherem Betrag",
    icon: "trending-up",
  },
  {
    value: "simple",
    label: "Ein Stempel pro Besuch",
    description: "Maximale Klarheit",
    icon: "check-circle",
  },
  {
    value: "gamify",
    label: "Spielerisch motivieren",
    description: "Mehr Dynamik, visuell stärker, Stempelgrößen",
    icon: "trophy",
  },
];

export const SPEND_PRESETS = [5, 8, 12, 20, 35];

export const TOTAL_STEPS = 8;

export const STEP_META = [
  { title: "Passwort erstellen", subtitle: "Sichere dein Konto mit einem Passwort" },
  { title: "Box-ID verknüpfen", subtitle: "Verbinde deine Starterbox" },
  { title: "Deine Branche", subtitle: "Wähle deine Branche aus" },
  { title: "Durchschnittlicher Einkaufswert", subtitle: "Wie viel gibt ein Kunde pro Besuch aus?" },
  { title: "Ziel des Bonussystems", subtitle: "Was ist dir am wichtigsten?" },
  { title: "Dein Stempelsystem", subtitle: "Unser Vorschlag basierend auf deinen Angaben" },
  { title: "Erste Prämie erstellen", subtitle: "Gib deinen Kunden einen Grund wiederzukommen" },
  { title: "Geschafft! 🎉", subtitle: "Dein Bonussystem ist bereit" },
];
