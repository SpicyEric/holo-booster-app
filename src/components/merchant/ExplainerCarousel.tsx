import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useAnimationFrame,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

export type ExplainerSlide = {
  emoji: string;
  title: string;
  text: string;
};

interface ExplainerCarouselProps {
  slides: ExplainerSlide[];
  finalNote?: string;
}

const GRADIENT_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];
const ANIMATION_SPEED_S = 8;

const GradientText = ({ children }: { children: React.ReactNode }) => {
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animationDuration = ANIMATION_SPEED_S * 1000;

  useAnimationFrame((time) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;
    const fullCycle = animationDuration * 2;
    const cycleTime = elapsedRef.current % fullCycle;
    if (cycleTime < animationDuration) {
      progress.set((cycleTime / animationDuration) * 100);
    } else {
      progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
    }
  });

  const gradientColors = [...GRADIENT_COLORS, GRADIENT_COLORS[0]].join(", ");
  const backgroundPosition = useTransform(progress, (p) => `${p}% 50%`);

  return (
    <motion.span
      style={{
        backgroundImage: `linear-gradient(to right, ${gradientColors})`,
        backgroundSize: "300% 100%",
        backgroundPosition,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        display: "inline-block",
      }}
      className="font-bold text-2xl md:text-[26px] leading-tight"
    >
      {children}
    </motion.span>
  );
};

const AnimatedWords = ({ text }: { text: string }) => {
  const words = text.split(" ");
  return (
    <p className="text-foreground/90 leading-relaxed text-base md:text-[17px] font-semibold text-center">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.1 + i * 0.025,
          }}
          style={{ display: "inline-block", marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
};

export const ExplainerCarousel = ({ slides, finalNote }: ExplainerCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = slides.length;
  const isLast = index === total - 1;

  const go = (dir: number) => {
    const next = Math.min(Math.max(index + dir, 0), total - 1);
    if (next === index) return;
    setDirection(dir);
    setIndex(next);
  };

  const goTo = (i: number) => {
    if (i === index) return;
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  };

  const slide = slides[index];

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f5f0ff 0%, #ede8ff 100%)",
          border: "1px solid rgba(82, 39, 255, 0.15)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(82, 39, 255, 0.12)",
        }}
      >
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Vorherige Karte"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/80 hover:bg-white shadow-md disabled:opacity-30 disabled:hover:bg-white/80 flex items-center justify-center text-primary transition-all backdrop-blur-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={isLast}
          aria-label="Nächste Karte"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/80 hover:bg-white shadow-md disabled:opacity-30 disabled:hover:bg-white/80 flex items-center justify-center text-primary transition-all backdrop-blur-sm"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          className="relative px-12 md:px-16 py-10 md:py-12 overflow-hidden"
          style={{ minHeight: "280px" }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ x: direction * 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -80, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center max-w-2xl mx-auto"
            >
              <div
                className="mb-4 select-none leading-none"
                style={{ fontSize: "64px" }}
                aria-hidden
              >
                {slide.emoji}
              </div>
              <div className="mb-4">
                <GradientText>{slide.title}</GradientText>
              </div>
              <AnimatedWords text={slide.text} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2 pb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Karte ${i + 1}`}
              className={cn(
                "rounded-full transition-all",
                i === index
                  ? "w-7 h-2 bg-primary"
                  : "w-2 h-2 bg-primary/25 hover:bg-primary/50"
              )}
            />
          ))}
        </div>
      </div>

      {finalNote && (
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
              <p className="text-sm text-emerald-900 font-medium">{finalNote}</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ExplainerCarousel;
