import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { WizardState } from "./wizardLogic";

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

export default function WizardStepPassword({ state, onChange }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const passwordsMatch = state.password === state.confirmPassword && state.confirmPassword.length > 0;
  const tooShort = state.password.length > 0 && state.password.length < 8;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Sichere dein Konto</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Erstelle ein sicheres Passwort, um dein Konto zu schützen.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="password">Passwort</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mindestens 8 Zeichen"
              value={state.password}
              onChange={(e) => onChange({ password: e.target.value })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {tooShort && (
            <p className="text-xs text-destructive mt-1">Mindestens 8 Zeichen erforderlich</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
          <div className="relative mt-1">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Passwort wiederholen"
              value={state.confirmPassword}
              onChange={(e) => onChange({ confirmPassword: e.target.value })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {state.confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-destructive mt-1">Passwörter stimmen nicht überein</p>
          )}
          {passwordsMatch && (
            <p className="text-xs text-green-600 mt-1">✓ Passwörter stimmen überein</p>
          )}
        </div>
      </div>
    </div>
  );
}
