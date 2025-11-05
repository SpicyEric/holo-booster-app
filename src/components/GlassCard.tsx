import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard = ({ children, className, hover = true }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { scale: 1.02 } : {}}
      className={cn(
        "relative backdrop-blur-glass rounded-3xl p-6",
        "bg-card/60",
        "shadow-card",
        "transition-all duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
