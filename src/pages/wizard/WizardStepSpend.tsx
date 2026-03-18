import { Slider } from "@/components/ui/slider";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPEND_PRESETS } from "./wizardLogic";
import type { WizardState } from "./wizardLogic";

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

export default function WizardStepSpend({ state, onChange }: Props) {
  const allValues = [...SPEND_PRESETS, 50];

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        Wie viel gibt ein Kunde bei dir im Durchschnitt pro Besuch aus?
      </p>

      {/* Quick select buttons */}
      <div className="flex flex-wrap gap-3">
        {SPEND_PRESETS.map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange({ avgSpend: val })}
            className={cn(
              "px-5 py-2.5 rounded-full border-2 text-base font-medium transition-all",
              state.avgSpend === val
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/40"
            )}
          >
            ca. {val} €
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange({ avgSpend: 50 })}
          className={cn(
            "px-4 py-2 rounded-full border-2 text-sm font-medium transition-all",
            state.avgSpend === 50
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-foreground hover:border-primary/40"
          )}
        >
          &gt; 35 €
        </button>
      </div>

      {/* Slider */}
      <div className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 inline-block">
              <span className="text-lg font-bold text-primary">
                ca. {state.avgSpend} €
              </span>
            </div>
          </div>
          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
        </div>
        <Slider
          value={[state.avgSpend]}
          onValueChange={([val]) => onChange({ avgSpend: val })}
          min={3}
          max={50}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>3 €</span>
          <span>50 €</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border">
        Wir nutzen diesen Wert, um dir ein Punktesystem vorzuschlagen, das
        für dich und deine Kunden leicht verständlich bleibt.
      </p>
    </div>
  );
}
