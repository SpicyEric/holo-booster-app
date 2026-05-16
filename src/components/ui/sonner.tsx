import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { getActiveBrandColor, subscribeActiveBrandColor } from "@/lib/activeBrandColor";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const DEFAULT_BRAND = "#8B5CF6"; // Lila (App-Default)

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const [brand, setBrand] = useState<string>(getActiveBrandColor() || DEFAULT_BRAND);

  useEffect(() => {
    return subscribeActiveBrandColor((c) => setBrand(c || DEFAULT_BRAND));
  }, []);

  // Offset unter der nativen Status-/Infobar
  const topOffset = "calc(env(safe-area-inset-top, 0px) + 12px)";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group pointer-events-none"
      style={
        {
          top: topOffset,
          // CSS-Vars für Sonner-Tokens (offizielle API)
          "--normal-bg": "rgba(255, 255, 255, 0.92)",
          "--normal-text": "#1a1a2e",
          "--normal-border": `${brand}33`,
          "--border-radius": "20px",
          "--app-toast-brand": brand,
          "--app-toast-brand-soft": `${brand}1f`,
        } as React.CSSProperties
      }
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "app-toast pointer-events-auto group toast flex items-center gap-3 !rounded-2xl !border !backdrop-blur-xl !shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)] !px-4 !py-3.5",
          title: "!font-semibold !text-[15px] !leading-snug",
          description: "!text-sm !text-neutral-600",
          icon: "!text-[color:var(--app-toast-brand)]",
          success: "!border-l-4 !border-l-[color:var(--app-toast-brand)]",
          error: "!border-l-4 !border-l-rose-500",
          warning: "!border-l-4 !border-l-amber-500",
          info: "!border-l-4 !border-l-[color:var(--app-toast-brand)]",
          actionButton:
            "!bg-[color:var(--app-toast-brand)] !text-white !rounded-full !px-3 !py-1.5 !text-xs !font-semibold",
          cancelButton:
            "!bg-neutral-100 !text-neutral-700 !rounded-full !px-3 !py-1.5 !text-xs",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
