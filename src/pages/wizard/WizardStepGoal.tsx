import {
  RefreshCw, TrendingUp, CheckCircle2, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GOAL_OPTIONS } from "./wizardLogic";
import type { WizardState } from "./wizardLogic";

const ICON_MAP: Record<string, React.ElementType> = {
  repeat: RefreshCw,
  "trending-up": TrendingUp,
  "check-circle": CheckCircle2,
  trophy: Trophy,
};

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

export default function WizardStepGoal({ state, onChange }: Props) {
  const toggle = (value: string) => {
    const current = state.goals;
    if (current.includes(value)) {
      onChange({ goals: current.filter((g) => g !== value) });
    } else {
      onChange({ goals: [...current, value] });
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-base text-muted-foreground">
        Was ist dir wichtiger? Du kannst auch mehrere auswählen.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GOAL_OPTIONS.map((goal) => {
          const Icon = ICON_MAP[goal.icon] || CheckCircle2;
          const selected = state.goals.includes(goal.value);
          return (
            <button
              key={goal.value}
              type="button"
              onClick={() => toggle(goal.value)}
              className={cn(
                "flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all",
                "hover:border-primary/40 hover:bg-primary/5",
                selected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                  selected ? "bg-primary/20" : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "text-base font-semibold",
                    selected ? "text-primary" : "text-foreground"
                  )}
                >
                  {goal.label}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {goal.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
