import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";

type Review = {
  id: number;
  stars: 4 | 5;
  age: number; // age in seconds since insertion
};

// Sterne-Logik: meist abwechselnd zwischen 5 und 4, gelegentlich (~25 %) gleicher Stern wie zuletzt
const pickStars = (last: 4 | 5 | null): 4 | 5 => {
  if (last === null) return 5;
  const repeat = Math.random() < 0.25;
  if (repeat) return last;
  return last === 5 ? 4 : 5;
};
// Unregelmäßige Pausen-Sequenz (in ms) → wirkt wie echte Echtzeit-Bewertungen.
// Mischung aus schnellen Bursts und längeren Wartepausen.
const DELAY_PATTERN = [
  900,    // erste schnell
  600,    // burst
  650,    // burst
  3800,   // lange Pause
  1100,
  500,    // kurzer burst
  600,
  4200,   // sehr lange Pause
  900,
  2200,
  700,
  650,
  3400,   // Pause
  1000,
  500,
];

const formatAge = (sec: number) => {
  if (sec < 5) return "Gerade eben";
  if (sec < 60) return `Vor ${sec} Sek.`;
  const min = Math.floor(sec / 60);
  return `Vor ${min} Min.`;
};

const GoogleReviewsCard = () => {
  const [reviews, setReviews] = useState<Review[]>([
    { id: 1, stars: 5, age: 120 },
    { id: 2, stars: 5, age: 3600 },
  ]);
  const [, force] = useState(0);
  const nextIdRef = useRef(3);
  const patternIndexRef = useRef(0);

  // Insert neue Bewertung gemäß DELAY_PATTERN (loopt durch)
  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNext = () => {
      const delay = DELAY_PATTERN[patternIndexRef.current % DELAY_PATTERN.length];
      patternIndexRef.current += 1;
      timeoutId = window.setTimeout(() => {
        const stars = STAR_POOL[Math.floor(Math.random() * STAR_POOL.length)];
        setReviews((prev) => {
          const next: Review = { id: nextIdRef.current++, stars, age: 0 };
          // Maximal 4 anzeigen, älteste fliegt raus
          return [next, ...prev].slice(0, 4);
        });
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Lass „age" pro Sekunde tickern, damit „Vor X Sek." aktualisiert wird
  useEffect(() => {
    const interval = window.setInterval(() => {
      setReviews((prev) => prev.map((r) => ({ ...r, age: r.age + 1 })));
      force((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[480px] mx-auto md:mx-0 md:ml-auto">
      <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
      <div className="relative bg-white rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div
          className="flex justify-between items-end pb-4"
          style={{ borderBottom: "1px solid rgba(204,195,216,0.2)" }}
        >
          <div>
            <p className="text-sm font-bold text-[#4a4455]">Google Sichtbarkeit</p>
            <p className="text-3xl font-black font-headline">+240%</p>
          </div>
          <div className="flex gap-1 items-end h-16">
            {[4, 8, 6, 10, 16].map((h, i) => (
              <div
                key={i}
                className={`w-4 rounded-t ${i === 4 ? "bg-primary" : "bg-primary/20"}`}
                style={{ height: `${h * 4}px` }}
              />
            ))}
          </div>
        </div>

        {/* Live review feed */}
        <div className="space-y-3 min-h-[224px]">
          <AnimatePresence initial={false}>
            {reviews.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 28,
                  mass: 0.6,
                }}
                className="flex items-center justify-between p-3 bg-[#eeedf5] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500" fill="currentColor" />
                    ))}
                    {r.stars === 4 && (
                      <Star className="h-4 w-4 text-yellow-500/30" fill="currentColor" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-[#1a1b21]">
                    Neue {r.stars}-Sterne Bewertung
                  </span>
                </div>
                <span className="text-xs text-[#4a4455] tabular-nums">
                  {formatAge(r.age)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GoogleReviewsCard;
