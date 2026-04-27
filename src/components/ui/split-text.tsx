import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SplitType = "chars" | "words";

interface SplitTextProps {
  text: string;
  splitType?: SplitType;
  from?: { opacity?: number; y?: number; x?: number };
  to?: { opacity?: number; y?: number; x?: number };
  duration?: number;
  /** Delay between segments in ms */
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * SplitText — animates a string segment-by-segment (words or chars).
 * Each segment animates from `from` to `to` with a staggered delay.
 */
export const SplitText = ({
  text,
  splitType = "words",
  from = { opacity: 0, y: 20 },
  to = { opacity: 1, y: 0 },
  duration = 0.6,
  delay = 60,
  className,
  as: Tag = "span",
}: SplitTextProps) => {
  const segments = splitType === "chars" ? Array.from(text) : text.split(" ");

  return (
    <Tag className={cn("inline-block", className)}>
      {segments.map((seg, i) => (
        <motion.span
          key={`${i}-${seg}`}
          initial={from}
          animate={to}
          transition={{
            duration,
            ease: [0.22, 1, 0.36, 1],
            delay: (i * delay) / 1000,
          }}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
          }}
        >
          {seg}
          {splitType === "words" && i < segments.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </Tag>
  );
};

export default SplitText;
