import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SplitType = "chars" | "words";

interface SplitTextProps {
  text: string;
  splitType?: SplitType;
  from?: { opacity?: number; y?: number; x?: number };
  to?: { opacity?: number; y?: number; x?: number };
  /** Duration per segment in seconds */
  duration?: number;
  /** Delay between segments in ms (stagger) */
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

// Approximation of GSAP's "power3.out" easing as a cubic-bezier
const POWER3_OUT: [number, number, number, number] = [0.215, 0.61, 0.355, 1];

/**
 * SplitText — animates a string char-by-char (or word-by-word) with a
 * staggered reveal. Mirrors the GSAP SplitText defaults:
 *   from: { opacity: 0, y: 40 }
 *   to:   { opacity: 1, y: 0 }
 *   duration: 1.25s, stagger: 50ms, ease: power3.out
 */
export const SplitText = ({
  text,
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  duration = 1.25,
  delay = 50,
  className,
  as: Tag = "span",
}: SplitTextProps) => {
  // Word-level split that preserves spaces; for chars we further break each word
  // into characters but keep words as inline-block units so wrapping looks right.
  const words = text.split(" ");

  const TagAny = Tag as any;
  return (
    <TagAny
      className={cn("inline-block", className)}
      style={{ overflow: "hidden" }}
    >
      {(() => {
        let globalIndex = 0;
        return words.map((word, wIdx) => {
          const isLastWord = wIdx === words.length - 1;
          const segments =
            splitType === "chars" ? Array.from(word) : [word];

          return (
            <span
              key={`w-${wIdx}`}
              style={{
                display: "inline-block",
                whiteSpace: "nowrap",
              }}
            >
              {segments.map((seg, sIdx) => {
                const i = globalIndex++;
                return (
                  <motion.span
                    key={`s-${wIdx}-${sIdx}`}
                    initial={from}
                    animate={to}
                    transition={{
                      duration,
                      ease: POWER3_OUT,
                      delay: (i * delay) / 1000,
                    }}
                    style={{
                      display: "inline-block",
                      willChange: "transform, opacity",
                    }}
                  >
                    {seg}
                  </motion.span>
                );
              })}
              {!isLastWord && (
                <span style={{ display: "inline-block", whiteSpace: "pre" }}>
                  {" "}
                </span>
              )}
            </span>
          );
        });
      })()}
    </Tag>
  );
};

export default SplitText;
