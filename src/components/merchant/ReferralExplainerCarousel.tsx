import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slide = {
  emoji: string;
  title: string;
  body: React.ReactNode;
};

const slides: Slide[] = [
  {
    emoji: "🔥",
    title: "Was wäre, wenn...",
    body: (
      <>
        <p>
          „Was wäre, wenn deine zufriedenen Kunden für dich neue Kunden ins Geschäft holen — ohne dass du einen Euro für Werbung ausgibst?"
        </p>
        <p>Das ist kein Traum. Das ist Eloyo Empfehlungsmarketing.</p>
      </>
    ),
  },
  {
    emoji: "💡",
    title: "Der wahre Wert eines Neukunden",
    body: (
      <>
        <p>
          „Ein neuer Kunde ist nicht nur ein Einkauf. Er ist ein potenzieller Stammkunde, der über Monate oder Jahre bei dir kauft."
        </p>
        <p>Jede erfolgreiche Empfehlung kann langfristig Hunderte Euro wert sein.</p>
      </>
    ),
  },
  {
    emoji: "⚙️",
    title: "So funktioniert's",
    body: (
      <>
        <p>
          „Deine Kunden laden Freunde per WhatsApp ein. Der Freund hat <strong>7 Tage</strong> Zeit, bei dir vorbeizukommen und seinen ersten Stempel zu sammeln."
        </p>
        <p>Erst wenn er wirklich einkauft und Punkte bekommt, zählt die Einladung.</p>
      </>
    ),
  },
  {
    emoji: "🎁",
    title: "Was bekommt wer?",
    body: (
      <>
        <p>
          „Der Eingeladene bekommt <strong>doppelte Punkte</strong> beim ersten Stempel — als Willkommensbonus."
        </p>
        <p>Der Einladende bekommt Bonuspunkte von dir — die du selbst festlegst.</p>
      </>
    ),
  },
  {
    emoji: "🧮",
    title: "Die magische Formel",
    body: (
      <>
        <p>
          „Empfehle ca. <strong>50 %</strong> der Punkte für eine Standardleistung als Einlader-Bonus."
        </p>
        <p>
          <strong>Beispiel Barbershop:</strong> Haarschnitt = 160 Punkte → Einlader-Bonus = 80 Punkte → 2 Empfehlungen = Gratis-Haarschnitt.
        </p>
      </>
    ),
  },
  {
    emoji: "🛡️",
    title: "Du bist geschützt",
    body: (
      <>
        <p>
          „Nur echte Neukunden können eingeladen werden — wer bei dir schon Punkte hat, kann nicht nochmal eingeladen werden."
        </p>
        <p>Jede Person kann auch nur von einem Freund gleichzeitig eingeladen werden. Kein Missbrauch möglich.</p>
      </>
    ),
  },
  {
    emoji: "🌨️",
    title: "Der Schneeball-Effekt",
    body: (
      <>
        <p>
          „Jeder neue Kunde, der durch eine Empfehlung kommt, empfiehlt selbst weiter — weil er Bock hat, sich etwas Gratis abzuholen."
        </p>
        <p>Mit der Zeit wächst dein Stammkundenkreis organisch — ganz ohne Werbekosten.</p>
      </>
    ),
  },
];

export const ReferralExplainerCarousel = () => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = slides.length;
  const isLast = index === total - 1;

  const go = (dir: number) => {
    setDirection(dir);
    setIndex((i) => Math.min(Math.max(i + dir, 0), total - 1));
  };

  const goTo = (i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  };

  const slide = slides[index];

  return (
    <div className="relative">
      <div className="relative bg-card rounded-2xl border border-primary/15 shadow-sm overflow-hidden">
        {/* Navigation arrows */}
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Vorherige Karte"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 disabled:opacity-30 disabled:hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={isLast}
          aria-label="Nächste Karte"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 disabled:opacity-30 disabled:hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Slide content */}
        <div className="relative min-h-[260px] px-14 py-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ x: direction * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -60, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center text-center max-w-2xl mx-auto"
            >
              <div className="text-5xl mb-3 select-none" aria-hidden>
                {slide.emoji}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {slide.title}
              </h3>
              <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                {slide.body}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pb-5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Karte ${i + 1}`}
              className={cn(
                "rounded-full transition-all",
                i === index
                  ? "w-6 h-2 bg-primary"
                  : "w-2 h-2 bg-primary/25 hover:bg-primary/50"
              )}
            />
          ))}
        </div>
      </div>

      {/* Final confirmation */}
      <AnimatePresence>
        {isLast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-3 flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm text-emerald-900 font-medium">
              Du weißt jetzt alles über Empfehlungsmarketing. Stell deinen Bonus ein und leg los! 🚀
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReferralExplainerCarousel;
