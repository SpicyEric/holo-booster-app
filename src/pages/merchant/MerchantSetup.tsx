import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, ArrowLeft,
  Package, Store, ShoppingCart, Target, Stamp, Gift, CheckCircle2, Loader2, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import eloyoLogo from "@/assets/eloyo-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { linkOrphanNfcChipsToMerchant } from "@/lib/nfcChipLinking";

import { initialWizardState, STEP_META, calculateSuggestion, suggestedRewardPoints } from "../wizard/wizardLogic";
import type { WizardState } from "../wizard/wizardLogic";
import WizardStepBoxId from "../wizard/WizardStepBoxId";
import WizardStepBusiness from "../wizard/WizardStepBusiness";
import WizardStepSpend from "../wizard/WizardStepSpend";
import WizardStepGoal from "../wizard/WizardStepGoal";
import WizardStepSuggestion from "../wizard/WizardStepSuggestion";
import WizardStepReward from "../wizard/WizardStepReward";
import WizardStepComplete from "../wizard/WizardStepComplete";

// Real wizard skips password step (step 0), so we use steps 1-7 from STEP_META
const WIZARD_STEPS = STEP_META.slice(1); // 7 steps
const TOTAL = WIZARD_STEPS.length;
const STEP_ICONS = [Package, Store, ShoppingCart, Target, Stamp, Gift, CheckCircle2];

export default function MerchantSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>({ ...initialWizardState });

  const update = (updates: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...updates }));

  // Load merchant assignment
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data: assignment } = await supabase
          .from("merchant_assignments")
          .select("customer_id")
          .eq("merchant_user_id", user.id)
          .maybeSingle();

        if (!assignment?.customer_id) {
          setLoading(false);
          return;
        }
        setCustomerId(assignment.customer_id);

        const { count } = await supabase
          .from("customer_boxes")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", assignment.customer_id);

        if (count && count > 0) {
          setStep(1);
        }

        const { data: customer } = await supabase
          .from("customers")
          .select("name, industry, avg_revenue")
          .eq("id", assignment.customer_id)
          .single();

        if (customer) {
          if (customer.name) update({ businessName: customer.name });
          if (customer.industry) update({ industry: customer.industry });
          if (customer.avg_revenue) update({ avgSpend: customer.avg_revenue });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const goNext = () => {
    setDirection(1);
    if (step < TOTAL - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    if (step > 0) setStep((s) => s - 1);
  };

  // ─── Step actions ───

  const handleLinkBox = async () => {
    if (!customerId || !state.boxId.trim()) return;
    const pattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
    if (!pattern.test(state.boxId)) {
      toast.error("Ungültiges Format: XXXXX-XXXXX-XXXXX");
      return;
    }
    setSaving(true);
    try {
      const { data: boxData } = await supabase
        .from("boxes")
        .select("id, stamp_id, stamp_preset")
        .eq("stamp_id", state.boxId)
        .maybeSingle();

      if (!boxData) { toast.error("Karten-ID existiert nicht"); return; }

      const { count } = await supabase
        .from("customer_boxes")
        .select("id", { count: "exact", head: true })
        .eq("box_id", boxData.id);

      if (count && count > 0) { toast.error("Diese Karten-ID ist bereits vergeben"); return; }

      await supabase.from("customer_boxes").insert({
        customer_id: customerId,
        box_id: boxData.id,
      });

      // Link eloyo_box if exists with this stamp_id — trigger handles status automatically
      const { data: eloyoBox } = await supabase
        .from("eloyo_boxes")
        .select("id")
        .eq("stempel_id", state.boxId)
        .in("status", ["versendet", "verfuegbar"])
        .maybeSingle();

      if (eloyoBox) {
        await supabase.from("eloyo_boxes").update({
          haendler_id: customerId,
        }).eq("id", eloyoBox.id);
        // Verknüpfe ggf. bereits registrierte Hardware-Chips mit dem Händler
        await linkOrphanNfcChipsToMerchant(state.boxId, customerId);
      }

      const preset = boxData.stamp_preset || "standard_3";
      const colors = preset === "standard_5"
        ? ["grün", "blau", "rot", "gelb", "lila"]
        : ["grün", "blau", "rot"];

      // Pro Farbe genau EINEN Eintrag sicherstellen (kein Platzhalter-Spam).
      // Wenn ein echter Chip (Hardware) bereits per linkOrphanNfcChipsToMerchant
      // verknüpft wurde, lassen wir den intakt — sonst legen wir den Slot an.
      for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        const { data: existing } = await supabase
          .from("nfc_chips")
          .select("id")
          .eq("merchant_customer_id", customerId)
          .eq("stamp_color", color)
          .maybeSingle();

        if (!existing) {
          await supabase.from("nfc_chips").insert({
            merchant_customer_id: customerId,
            chip_uid: `${customerId!.substring(0, 8)}-${color}`,
            stamp_name: color.charAt(0).toUpperCase() + color.slice(1),
            stamp_color: color,
            points_value: 1,
            is_active: true,
            is_default: i === 0,
          });
        }
      }

      toast.success("Karten-ID erfolgreich verknüpft! 🎉");
      goNext();
    } catch {
      toast.error("Fehler beim Verknüpfen");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusiness = async () => {
    if (!customerId) return;
    if (!state.industry) { toast.error("Bitte Branche wählen"); return; }
    setSaving(true);
    try {
      await supabase.from("customers").update({
        industry: state.industry,
        updated_at: new Date().toISOString(),
      }).eq("id", customerId);
      goNext();
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStampSystem = async () => {
    if (!customerId) return;
    const isSimpleOnly = state.goals.length === 1 && state.goals.includes("simple");
    const suggestion = calculateSuggestion(
      state.avgSpend,
      state.goals,
      isSimpleOnly ? "simple" : state.selectedVariant
    );

    setSaving(true);
    try {
      await supabase.from("customers").update({
        avg_revenue: state.avgSpend,
        stamp_mode: suggestion.type === "simple" ? "simple" : "tiered",
        updated_at: new Date().toISOString(),
      }).eq("id", customerId);

      if (suggestion.type === "tiered" && suggestion.tiers) {
        const colorMap: Record<string, string> = {
          green: "grün",
          blue: "blau",
          red: "rot",
        };
        for (const tier of suggestion.tiers) {
          const dbColor = colorMap[tier.color] || tier.color;
          await supabase.from("nfc_chips")
            .update({ points_value: tier.points })
            .eq("merchant_customer_id", customerId)
            .eq("stamp_color", dbColor);
        }
      } else if (suggestion.type === "simple") {
        await supabase.from("nfc_chips")
          .update({ points_value: suggestion.pointsPerVisit ?? 5 })
          .eq("merchant_customer_id", customerId);
      }

      goNext();
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateReward = async () => {
    if (!customerId) return;
    if (!state.rewardName.trim()) { toast.error("Bitte Prämienname eingeben"); return; }

    const isSimpleOnly = state.goals.length === 1 && state.goals.includes("simple");
    const suggestion = calculateSuggestion(
      state.avgSpend,
      state.goals,
      isSimpleOnly ? "simple" : state.selectedVariant
    );
    const pointsCost = suggestedRewardPoints(suggestion);

    setSaving(true);
    try {
      await supabase.from("rewards").insert({
        merchant_customer_id: customerId,
        title: state.rewardName,
        description: state.rewardDescription || null,
        image_url: state.rewardImageUrl || null,
        points_required: pointsCost,
        is_active: true,
      });

      await supabase.from("customers").update({
        stamps_required: pointsCost,
        stamp_reward_text: state.rewardName,
        updated_at: new Date().toISOString(),
      }).eq("id", customerId);

      toast.success("Prämie erstellt! 🎉");
      goNext();
    } catch {
      toast.error("Fehler beim Erstellen der Prämie");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    toast.success("Einrichtung abgeschlossen! 🎉");
    navigate("/kunde/mein-geschaeft");
  };

  const handleStepAction = () => {
    switch (step) {
      case 0: return handleLinkBox();
      case 1: return handleSaveBusiness();
      case 2: goNext(); return;
      case 3: goNext(); return;
      case 4: return handleSaveStampSystem();
      case 5: return handleCreateReward();
      case 6: return handleFinish();
    }
  };

  const isStepValid = (() => {
    switch (step) {
      case 0: return state.boxId.trim().length === 17;
      case 1: return state.industry.length > 0;
      case 2: return true;
      case 3: return state.goals.length > 0;
      case 4: return true;
      case 5: return state.rewardName.trim().length > 0;
      case 6: return true;
      default: return true;
    }
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(262,40%,93%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="min-h-screen bg-[hsl(262,40%,93%)] flex items-center justify-center p-6">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Kein Geschäft zugewiesen</h2>
          <p className="text-muted-foreground">Bitte kontaktiere support@eloyo.de</p>
        </div>
      </div>
    );
  }

  const meta = WIZARD_STEPS[step];
  const Icon = STEP_ICONS[step];
  const isLastStep = step === TOTAL - 1;

  const buttonLabel = (() => {
    if (isLastStep) return "Loslegen";
    if (step === 0) return "Einrichtung starten";
    return "Weiter";
  })();

  return (
    <div className="min-h-screen bg-[hsl(262,40%,93%)] flex">
      {/* ─── Left Sidebar ─── */}
      <div className="hidden md:flex w-72 bg-[hsl(262,50%,18%)] text-white flex-col">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <img src={eloyoLogo} alt="Eloyo" className="h-7 w-auto brightness-0 invert" />
          <p className="text-xs text-white/50 mt-2">Einrichtungsassistent</p>
        </div>

        {/* Step list */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {WIZARD_STEPS.map((s, i) => {
            const StepIcon = STEP_ICONS[i];
            const isCompleted = i < step;
            const isCurrent = i === step;
            const isFuture = i > step;

            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                  isCurrent && "bg-white/10",
                  isFuture && "opacity-40"
                )}
              >
                {/* Step indicator */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                    isCompleted && "bg-emerald-500",
                    isCurrent && "bg-primary",
                    isFuture && "bg-white/10"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <StepIcon className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Step text */}
                <div className="min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isCurrent ? "text-white" : "text-white/70"
                  )}>
                    {s.title}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-white/40 truncate">{s.subtitle}</p>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 space-y-3">
          <p className="text-xs text-white/30">Schritt {step + 1} von {TOTAL}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/kunde/mein-geschaeft")}
            className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
          >
            Wizard überspringen
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="md:hidden border-b border-border bg-card sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <img src={eloyoLogo} alt="Eloyo" className="h-7 w-auto" />
            <span className="text-sm text-muted-foreground">Schritt {step + 1} von {TOTAL}</span>
          </div>
          <div className="h-1 bg-muted">
            <motion.div className="h-full bg-primary" animate={{ width: `${((step + 1) / TOTAL) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex items-start justify-center overflow-y-auto">
          <div className="w-full max-w-2xl px-6 py-10">
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
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{meta.title}</h2>
                    <p className="text-base text-muted-foreground">{meta.subtitle}</p>
                  </div>
                </div>

                {/* Step Content */}
                <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm">
                  {step === 0 && <WizardStepBoxId state={state} onChange={update} />}
                  {step === 1 && <WizardStepBusiness state={state} onChange={update} />}
                  {step === 2 && <WizardStepSpend state={state} onChange={update} />}
                  {step === 3 && <WizardStepGoal state={state} onChange={update} />}
                  {step === 4 && <WizardStepSuggestion state={state} onChange={update} />}
                  {step === 5 && <WizardStepReward state={state} onChange={update} />}
                  {step === 6 && <WizardStepComplete />}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <div>
                {step > 1 && !isLastStep && (
                  <Button variant="ghost" size="sm" onClick={goBack} className="rounded-xl">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Zurück
                  </Button>
                )}
              </div>
              <Button
                onClick={handleStepAction}
                disabled={!isStepValid || saving}
                className="rounded-xl"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : isLastStep ? (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                ) : null}
                {saving ? "Speichern..." : buttonLabel}
                {!isLastStep && !saving && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
