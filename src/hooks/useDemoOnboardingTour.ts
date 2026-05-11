import { useEffect, useState } from "react";
import { getDemoOnboardingStep, onDemoOnboardingTourChange } from "@/lib/demoOnboardingTour";

export function useDemoOnboardingTour(): number | null {
  const [step, setStep] = useState<number | null>(() => getDemoOnboardingStep());
  useEffect(() => {
    const update = () => setStep(getDemoOnboardingStep());
    update();
    return onDemoOnboardingTourChange(update);
  }, []);
  return step;
}
