import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Globaler Banner für Vertriebspartner: zeigt sich, wenn der Vertrag eine
 * neue Version benötigt (vertrag_outdated = true). Wird in jedem Vertriebler-Layout
 * gerendert, blendet sich aber auf der Vertragsseite selbst aus.
 */
export function VertragOutdatedBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [outdated, setOutdated] = useState(false);
  const [outdatedSeit, setOutdatedSeit] = useState<string | null>(null);
  const [inaktiv, setInaktiv] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await (supabase.from("sales_rep_profiles") as any)
        .select("vertrag_outdated, vertrag_outdated_seit, vertrag_inaktiv")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active || !data) return;
      setOutdated(!!data.vertrag_outdated);
      setOutdatedSeit(data.vertrag_outdated_seit || null);
      setInaktiv(!!data.vertrag_inaktiv);
    })();
    return () => { active = false; };
  }, [user]);

  if (!outdated && !inaktiv) return null;
  // Auf Vertragsseite selbst nicht doppelt zeigen
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/vertriebler/vertrag")) return null;

  const tageOffen = outdatedSeit
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(outdatedSeit).getTime()) / 86_400_000))
    : 30;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3 mb-4">
      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">
          {inaktiv
            ? "Dein Account ist gesperrt – du hast die neue Vertragsversion nicht innerhalb von 30 Tagen angenommen."
            : `Neue Vertragsversion verfügbar – bitte innerhalb von ${tageOffen} Tagen annehmen.`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Bis zur Annahme sind <strong>Boxenbestellung und Auszahlung gesperrt</strong>.
        </p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => navigate("/vertriebler/vertrag")}>
          Zum Vertrag →
        </Button>
      </div>
    </div>
  );
}
