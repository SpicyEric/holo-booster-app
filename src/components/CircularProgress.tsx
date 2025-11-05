import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
  className?: string;
}

export const CircularProgress = ({
  value,
  size = 200,
  strokeWidth = 12,
  label,
  subLabel,
  className,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(0 0% 20%)"
          strokeWidth={strokeWidth}
        />
        
        {/* Gradient progress circle */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(262 83% 58%)" />
            <stop offset="100%" stopColor="hsl(217 91% 60%)" />
          </linearGradient>
        </defs>
        
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="drop-shadow-[0_0_10px_hsl(262_83%_58%/0.6)]"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="text-4xl font-bold text-foreground"
          >
            {label}
          </motion.div>
        )}
        {subLabel && (
          <div className="text-sm text-muted-foreground mt-1">{subLabel}</div>
        )}
      </div>
    </div>
  );
};
