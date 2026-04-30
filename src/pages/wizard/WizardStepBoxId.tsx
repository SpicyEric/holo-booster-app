import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Sparkles } from "lucide-react";
import type { WizardState } from "./wizardLogic";
import eloyoLogo from "@/assets/eloyo-logo.png";

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

export default function WizardStepBoxId({ state, onChange }: Props) {
  const formatBoxIdInput = (value: string) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join("-");
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">
          Willkommen bei eloyo! 🎉
        </h3>
        <p className="text-base text-muted-foreground mt-2 max-w-md mx-auto">
          Schön, dass du dich für uns entschieden hast! Wir starten jetzt
          direkt mit deiner Einrichtung.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-base font-medium text-foreground">
              Karten-ID eingeben
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Du findest deine Karten-ID auf der Innenseite des Deckels deiner
              Starterbox.
            </p>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="boxId">Karten-ID</Label>
        <Input
          id="boxId"
          placeholder="XXXXX-XXXXX-XXXXX"
          value={state.boxId}
          onChange={(e) =>
            onChange({ boxId: formatBoxIdInput(e.target.value) })
          }
          className="mt-1 font-mono text-lg tracking-wider text-center"
          maxLength={17}
        />
      </div>
    </div>
  );
}
