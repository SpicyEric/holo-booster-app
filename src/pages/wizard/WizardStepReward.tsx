import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Upload, Info, Lightbulb } from "lucide-react";
import { calculateSuggestion, suggestedRewardPoints } from "./wizardLogic";
import type { WizardState } from "./wizardLogic";

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

const EXAMPLE_REWARDS: Record<string, string[]> = {
  cafe: ["Gratis Kaffee", "Gratis Croissant", "Gratis Getränk nach Wahl"],
  baeckerei: ["Gratis Brötchen", "Gratis Teilchen", "10% auf die nächste Bestellung"],
  restaurant: ["Gratis Dessert", "Gratis Getränk", "10% auf den nächsten Besuch"],
  friseur: ["Gratis Styling-Produkt", "10% auf den nächsten Schnitt"],
  barbershop: ["Gratis Bartpflege", "Gratis Styling"],
  default: ["Gratis Produkt", "10% Rabatt", "Kleines Geschenk"],
};

export default function WizardStepReward({ state, onChange }: Props) {
  const isSimpleOnly = state.goals.length === 1 && state.goals.includes("simple");
  const suggestion = calculateSuggestion(
    state.avgSpend,
    state.goals,
    isSimpleOnly ? "simple" : state.selectedVariant
  );
  const recommendedPoints = suggestedRewardPoints(suggestion);
  const examples =
    EXAMPLE_REWARDS[state.industry] ?? EXAMPLE_REWARDS.default;

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-foreground space-y-1">
            <p className="font-medium">Tipp für deine erste Prämie</p>
            <p className="text-muted-foreground">
              Das Ziel der ersten Prämie sollte sein, dass ein
              Durchschnittskunde nach ca. 5 Besuchen seine erste kleine
              Belohnung bekommt. Wir empfehlen daher ca.{" "}
              <span className="font-bold text-primary">
                {recommendedPoints} Punkte
              </span>{" "}
              als Preis.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 border border-border">
        <p className="text-sm font-medium text-foreground mb-2">
          💡 Beispiele aus deiner Branche:
        </p>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange({ rewardName: ex })}
              className="text-sm bg-card border border-border px-3 py-1.5 rounded-full hover:border-primary/40 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="rewardName">Name der Prämie *</Label>
          <Input
            id="rewardName"
            placeholder="z.B. Gratis Kaffee"
            value={state.rewardName}
            onChange={(e) => onChange({ rewardName: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="rewardDesc">Beschreibung</Label>
          <Textarea
            id="rewardDesc"
            placeholder="z.B. Ein Getränk deiner Wahl bis 4,50 €"
            value={state.rewardDescription}
            onChange={(e) => onChange({ rewardDescription: e.target.value })}
            className="mt-1"
            rows={2}
          />
        </div>

        <div>
          <Label>Foto (optional)</Label>
          {state.rewardImageUrl ? (
            <div className="relative rounded-lg overflow-hidden mt-1">
              <img
                src={state.rewardImageUrl}
                alt="Prämie"
                className="w-full h-32 object-cover"
              />
              <button
                type="button"
                onClick={() => onChange({ rewardImageUrl: "" })}
                className="absolute bottom-2 right-2 bg-card/90 text-xs px-2 py-1 rounded"
              >
                Ändern
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors mt-1">
              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">
                Bild auswählen
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onChange({ rewardImageUrl: URL.createObjectURL(file) });
                  }
                }}
              />
            </label>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            Du kannst diese Prämie nachträglich jederzeit bearbeiten oder
            löschen.
          </span>
        </div>
      </div>
    </div>
  );
}
