import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, ChevronLeft, ArrowLeft, Eye,
  Lock, Package, Store, ShoppingCart, Target, Stamp, Gift, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import eloyoLogo from "@/assets/eloyo-logo.png";
import { initialWizardState, TOTAL_STEPS, STEP_META } from "./wizard/wizardLogic";
import type { WizardState } from "./wizard/wizardLogic";
import WizardStepPassword from "./wizard/WizardStepPassword";
import WizardStepBoxId from "./wizard/WizardStepBoxId";
import WizardStepBusiness from "./wizard/WizardStepBusiness";
import WizardStepSpend from "./wizard/WizardStepSpend";
import WizardStepGoal from "./wizard/WizardStepGoal";
import WizardStepSuggestion from "./wizard/WizardStepSuggestion";
import WizardStepReward from "./wizard/WizardStepReward";
import WizardStepComplete from "./wizard/WizardStepComplete";

const STEP_ICONS = [Lock, Package, Store, ShoppingCart, Target, Stamp, Gift, CheckCircle2];

export default function TestWizard() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [state, setState] = useState<WizardState>({ ...initialWizardState });

  const update = (updates: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...updates }));

  const adminGoTo = (targetStep: number) => {
    if (targetStep < 0 || targetStep >= TOTAL_STEPS) return;
    setDirection(targetStep > step ? 1 : -1);
    setStep(targetStep);
  };

  const goNext = () => {
    setDirection(1);
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    if (step > 0) setStep((s) => s - 1);
  };

  const meta = STEP_META[step];
  const Icon = STEP_ICONS[step];
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const isLastStep = step === TOTAL_STEPS - 1;

  const isStepValid = (() => {
    switch (step) {
      case 0:
        return state.password.length >= 8 && state.password === state.confirmPassword;
      case 1:
        return state.boxId.trim().length > 0;
      case 2:
        return state.businessName.trim().length > 0 && state.industry.length > 0;
      default:
        return true;
    }
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Test Bar */}
      <div className="sticky top-0 z-20 bg-destructive/10 border-b-2 border-destructive/30">
        <div className="max-w-2xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Admin Test-Modus</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => adminGoTo(step - 1)} disabled={step === 0} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">{step + 1} / {TOTAL_STEPS}</span>
            <Button variant="outline" size="sm" onClick={() => adminGoTo(step + 1)} disabled={step === TOTAL_STEPS - 1} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-card sticky top-[44px] z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={eloyoLogo} alt="Eloyo" className="h-7 w-auto" />
          <span className="text-sm text-muted-foreground">Schritt {step + 1} von {TOTAL_STEPS}</span>
        </div>
        <div className="h-1 bg-muted">
          <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ x: direction > 0 ? 80 : -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -80 : 80, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{meta.title}</h2>
                <p className="text-base text-muted-foreground">{meta.subtitle}</p>
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-card border border-border rounded-xl p-8">
              {step === 0 && <WizardStepPassword state={state} onChange={update} />}
              {step === 1 && <WizardStepBoxId state={state} onChange={update} />}
              {step === 2 && <WizardStepBusiness state={state} onChange={update} />}
              {step === 3 && <WizardStepSpend state={state} onChange={update} />}
              {step === 4 && <WizardStepGoal state={state} onChange={update} />}
              {step === 5 && <WizardStepSuggestion state={state} onChange={update} />}
              {step === 6 && <WizardStepReward state={state} onChange={update} />}
              {step === 7 && <WizardStepComplete />}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <div>
            {step > 2 && !isLastStep && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
            )}
          </div>
          <Button
            onClick={isLastStep ? () => alert("Wizard abgeschlossen – weiter zum Dashboard!") : goNext}
            disabled={!isStepValid}
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Loslegen
              </>
            ) : step === 0 ? (
              <>
                Passwort festlegen
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : step === 1 ? (
              <>
                Einrichtung starten
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Weiter
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
