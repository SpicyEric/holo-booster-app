import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Sparkles, X, CreditCard, Gift, UserPlus, Trophy, Bell, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  path: string;
}

const STEPS: ChecklistStep[] = [
  {
    key: "card_id_system",
    label: "Karten-ID & Punktesystem",
    description: "Karten-ID hinterlegen und Punkte pro Karte festlegen",
    icon: CreditCard,
    path: "/kunde/mein-geschaeft?tab=system",
  },
  {
    key: "new_customer_bonus",
    label: "Neukundenprämie erstellen",
    description: "Dein Werkzeug, um Kunden ins Punktesystem zu ziehen",
    icon: UserPlus,
    path: "/kunde/marketing",
  },
  {
    key: "rewards",
    label: "5 Prämien anlegen",
    description: "Belohnungen, die deine Kunden einlösen können",
    icon: Gift,
    path: "/kunde/mein-geschaeft?tab=praemien",
  },
  {
    key: "referral_bonus",
    label: "Empfehlungsbonus anlegen",
    description: "Punkte für erfolgreich geworbene Neukunden",
    icon: Trophy,
    path: "/kunde/marketing",
  },
  {
    key: "automations_reviews",
    label: "Automationen & Bewertungen",
    description: "Geburtstagsgrüße, Rückholnachrichten und Bewertungsbonus",
    icon: Bell,
    path: "/kunde/marketing",
  },
  {
    key: "profile_complete",
    label: "Geschäftsprofil vervollständigen",
    description: "Logo, Titelbild, Beschreibung, Öffnungszeiten & Kontakt",
    icon: Store,
    path: "/kunde/mein-geschaeft",
  },
];

const storageKey = (customerId: string) => `merchant-onboarding-checklist:${customerId}`;
const dismissedKey = (customerId: string) => `merchant-onboarding-checklist-dismissed:${customerId}`;

export default function OnboardingChecklist({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    try {
      const raw = localStorage.getItem(storageKey(customerId));
      if (raw) setCompleted(JSON.parse(raw));
      setDismissed(localStorage.getItem(dismissedKey(customerId)) === "true");
    } catch {}
  }, [customerId]);

  const allDone = STEPS.every(s => completed[s.key]);

  // Auto-hide once all done AND user dismissed
  if (dismissed && allDone) return null;

  const toggle = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = { ...completed, [key]: !completed[key] };
    setCompleted(next);
    try {
      localStorage.setItem(storageKey(customerId), JSON.stringify(next));
    } catch {}
  };

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedKey(customerId), "true");
    } catch {}
  };

  const doneCount = STEPS.filter(s => completed[s.key]).length;
  const progress = Math.round((doneCount / STEPS.length) * 100);

  return (
    <div className="relative bg-gradient-to-br from-white to-[hsl(262,40%,98%)] rounded-2xl border border-primary/20 shadow-[0_4px_20px_hsl(262,40%,70%/0.18)] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-[hsl(262,80%,70%)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Einrichtungs-Checkliste</h2>
              <p className="text-xs text-muted-foreground">
                {doneCount} von {STEPS.length} Schritten erledigt
              </p>
            </div>
          </div>
          {allDone && (
            <button
              onClick={close}
              className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Checkliste schließen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const isDone = !!completed[step.key];
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isDone
                    ? "bg-emerald-50/60 border-emerald-200/60"
                    : "bg-white border-border/40 hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <button
                  onClick={(e) => toggle(step.key, e)}
                  className={cn(
                    "w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                    isDone
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-muted-foreground/30 hover:border-primary"
                  )}
                  aria-label={isDone ? "Als offen markieren" : "Als erledigt markieren"}
                >
                  {isDone && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>

                <button
                  onClick={() => navigate(step.path)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    isDone ? "bg-emerald-100" : "bg-primary/[0.06]"
                  )}>
                    <Icon className={cn("w-4 h-4", isDone ? "text-emerald-600" : "text-primary")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isDone ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      {idx + 1}. {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-sm font-medium text-emerald-700">
              🎉 Alles erledigt! Du kannst die Checkliste jetzt schließen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
