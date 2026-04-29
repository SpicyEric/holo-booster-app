import { cn } from "@/lib/utils";
import { Stamp, Info } from "lucide-react";
import { calculateSuggestion } from "./wizardLogic";
import type { WizardState, StampSuggestion } from "./wizardLogic";

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

const COLOR_MAP: Record<string, string> = {
  green: "bg-emerald-100 border-emerald-400 text-emerald-700",
  blue: "bg-blue-100 border-blue-400 text-blue-700",
  red: "bg-red-100 border-red-400 text-red-700",
};

const STAMP_COLOR: Record<string, string> = {
  green: "text-emerald-500",
  blue: "text-blue-500",
  red: "text-red-500",
};

export default function WizardStepSuggestion({ state, onChange }: Props) {
  const isSimpleOnly =
    state.goals.length === 1 && state.goals.includes("simple");
  const suggestion = calculateSuggestion(
    state.avgSpend,
    state.goals,
    isSimpleOnly ? "simple" : state.selectedVariant
  );

  const exampleAmounts = [
    state.avgSpend * 0.5,
    state.avgSpend * 0.8,
    state.avgSpend * 1.3,
    state.avgSpend * 2.8,
  ];

  const getStampLabel = (amount: number): string => {
    if (suggestion.type === "simple") return "5 Punkte";
    const tiers = suggestion.tiers ?? [];
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (amount >= tiers[i].threshold)
        return `${tiers[i].label} (${tiers[i].points} Pkt.)`;
    }
    return "Kein Karte";
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-base text-muted-foreground">
          Für dein Team verständlich, für deine Kunden fair – passend zu
          deinem Einkaufswert von ca. {state.avgSpend} €.
        </p>
      </div>

      {/* Simple system */}
      {isSimpleOnly ? (
        <div className="bg-card border-2 border-primary rounded-xl p-6 text-center">
          <Stamp className="h-10 w-10 text-primary mx-auto mb-3" />
          <h4 className="font-bold text-foreground text-lg">
            Ein Stempel pro Besuch
          </h4>
          <p className="text-2xl font-bold text-primary mt-2">
            5 Punkte / Besuch
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Egal wie viel eingekauft wird – jeder Besuch zählt gleich.
          </p>
        </div>
      ) : (
        <>
          {/* Variant selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ selectedVariant: "balanced" })}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                state.selectedVariant === "balanced"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              ⚖️ Ausgewogen
            </button>
            <button
              type="button"
              onClick={() => onChange({ selectedVariant: "umsatzboost" })}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                state.selectedVariant === "umsatzboost"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              🚀 Umsatzboost
            </button>
          </div>

          {/* Stamp tiers */}
          <div className="grid grid-cols-3 gap-3">
            {suggestion.tiers?.map((tier) => (
              <div
                key={tier.label}
                className={cn(
                  "rounded-xl border-2 p-4 text-center",
                  COLOR_MAP[tier.color]
                )}
              >
                <Stamp
                  className={cn("h-8 w-8 mx-auto mb-2", STAMP_COLOR[tier.color])}
                />
                <p className="font-bold text-base">{tier.label}</p>
                <p className="text-sm mt-1">ab {tier.threshold} €</p>
                <p className="text-xl font-bold mt-1">{tier.points} Pkt.</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Example transactions */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Beispiel-Einkäufe
          </span>
        </div>
        <div className="space-y-2">
          {exampleAmounts.map((amt) => {
            const formatted = amt.toFixed(2).replace(".", ",");
            const label = getStampLabel(amt);
            return (
              <div
                key={amt}
                className="flex justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  Einkauf {formatted} €
                </span>
                <span
                  className={cn(
                    "font-medium",
                    label === "Kein Karte"
                      ? "text-muted-foreground"
                      : "text-foreground"
                  )}
                >
                  → {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customization hint */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <p className="text-sm text-muted-foreground">
          💡 Dies ist nur deine Ersteinrichtung – du kannst dein Stempelsystem
          jederzeit im Dashboard individuell anpassen.
        </p>
      </div>
    </div>
  );
}
