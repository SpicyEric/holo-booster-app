import { useNavigate } from "react-router-dom";
import { ArrowRight, X, Sparkles, GraduationCap, RotateCcw } from "lucide-react";
import { useDemoOnboardingTour } from "@/hooks/useDemoOnboardingTour";
import {
  TOUR_STEPS,
  endDemoOnboardingTour,
  setDemoOnboardingStep,
  startDemoOnboardingTour,
} from "@/lib/demoOnboardingTour";
import { disableDemoMerchant } from "@/lib/demoMerchant";
import { toast } from "sonner";

/**
 * Goldener Tour-Banner, der oberhalb des Demo-Merchant-Banners liegt
 * und den Vertriebler Schritt für Schritt durch die Einrichtung führt.
 */
export default function DemoOnboardingTourBanner() {
  const stepIndex = useDemoOnboardingTour();
  const navigate = useNavigate();

  if (stepIndex === null) return null;
  const step = TOUR_STEPS[Math.min(Math.max(stepIndex, 0), TOUR_STEPS.length - 1)];
  const isLast = stepIndex >= TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) return;
    setDemoOnboardingStep(stepIndex + 1);
  };

  const handleFinish = () => {
    endDemoOnboardingTour();
    const ret = disableDemoMerchant();
    toast.success("Demo-Tour abgeschlossen – stark gemacht!");
    navigate(ret || "/vertriebler", { replace: true });
  };

  const handleAbort = () => {
    endDemoOnboardingTour();
    const ret = disableDemoMerchant();
    navigate(ret || "/vertriebler", { replace: true });
  };

  const handleRestart = () => {
    startDemoOnboardingTour();
  };

  const copy = (text: string) => {
    try {
      navigator.clipboard?.writeText(text);
      toast.success("In die Zwischenablage kopiert");
    } catch {}
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-amber-950 shadow-lg border-b-2 border-amber-600/60">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-start gap-3 flex-wrap">
        <div className="w-9 h-9 rounded-full bg-amber-950/15 flex items-center justify-center shrink-0 mt-0.5">
          {isLast ? <Sparkles className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[11px] font-bold tracking-wider uppercase opacity-70">
              Quick Onboarding · {Math.min(stepIndex + 1, TOUR_STEPS.length)} von {TOUR_STEPS.length}
            </p>
          </div>
          <p className="text-sm font-bold leading-tight">{step.title}</p>
          <p className="text-[13px] leading-snug mt-0.5 whitespace-pre-line">{step.body}</p>
          {step.highlight && (
            <button
              onClick={() => copy(step.highlight!)}
              className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-950 text-amber-50 text-xs font-mono font-semibold hover:bg-amber-900 transition-colors active:scale-[0.97]"
              title="Kopieren"
            >
              {step.highlight}
              <span className="text-[10px] opacity-70">kopieren</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isLast ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950 text-amber-50 text-xs font-semibold hover:bg-amber-900 transition-colors active:scale-[0.97] animate-pulse"
            >
              Erledigt – weiter
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950/15 text-amber-950 text-xs font-semibold hover:bg-amber-950/25 transition-colors active:scale-[0.97]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tour neu starten
              </button>
              <button
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950 text-amber-50 text-xs font-semibold hover:bg-amber-900 transition-colors active:scale-[0.97]"
              >
                Tour beenden
              </button>
            </>
          )}
          <button
            onClick={handleAbort}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-950/10 text-amber-950 hover:bg-amber-950/20 transition-colors active:scale-[0.97]"
            title="Tour abbrechen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
