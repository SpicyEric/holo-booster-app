import { Label } from "@/components/ui/label";
import {
  Coffee, CakeSlice, UtensilsCrossed, Pizza, Scissors,
  Sparkles, ShoppingBag, Pill, Fuel, Store, Dumbbell,
  Paintbrush, IceCreamCone, Shirt, Flame, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INDUSTRIES } from "./wizardLogic";
import type { WizardState } from "./wizardLogic";

const ICON_MAP: Record<string, React.ElementType> = {
  coffee: Coffee,
  cake: CakeSlice,
  utensils: UtensilsCrossed,
  pizza: Pizza,
  scissors: Scissors,
  sparkles: Sparkles,
  "shopping-bag": ShoppingBag,
  pill: Pill,
  fuel: Fuel,
  store: Store,
  dumbbell: Dumbbell,
  paintbrush: Paintbrush,
  icecream: IceCreamCone,
  shirt: Shirt,
  flame: Flame,
  "more-horizontal": MoreHorizontal,
};

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

export default function WizardStepBusiness({ state, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-3 block">Branche auswählen</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Damit wir dir ein passendes Punktesystem empfehlen können.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {INDUSTRIES.map((ind) => {
            const Icon = ICON_MAP[ind.icon] || Store;
            const selected = state.industry === ind.value;
            return (
              <button
                key={ind.value}
                type="button"
                onClick={() => onChange({ industry: ind.value })}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                  "hover:border-primary/40 hover:bg-primary/5",
                  selected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium leading-tight",
                    selected ? "text-primary" : "text-foreground"
                  )}
                >
                  {ind.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
