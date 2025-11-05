import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  icon?: LucideIcon;
  type?: "button" | "submit";
  disabled?: boolean;
}

export const GradientButton = ({ 
  children, 
  onClick, 
  className, 
  icon: Icon,
  type = "button",
  disabled = false
}: GradientButtonProps) => {
  return (
    <motion.div whileHover={{ scale: disabled ? 1 : 1.05 }} whileTap={{ scale: disabled ? 1 : 0.95 }}>
      <Button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative overflow-hidden rounded-2xl px-8 py-6 text-lg font-semibold",
          "bg-gradient-primary text-primary-foreground",
          "shadow-glow border-0",
          "transition-all duration-300",
          "hover:shadow-[0_8px_40px_hsl(262_83%_58%/0.4)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <span className="relative z-10 flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5" />}
          {children}
        </span>
      </Button>
    </motion.div>
  );
};
